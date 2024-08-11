# typed: true

require 'pathname'
require 'csv'
require 'date'
require 'yaml'
require 'date'

require 'oga'

module Utils
  extend self
  include Kernel

  TAGS_FILE = Pathname("tags.csv")
  LIST_FILE = Pathname("list.yaml")
  MEDIA_FILES = %w[mp3 wav flac aac ogg m4a]

  def init(option)
    det_dir = option[:det_root]
    id_map_file = option[:id_map]

    if !det_dir.exist? || !det_dir.directory? then
      $stderr.puts("No detections dir #{det_dir}")
      exit(1)
    elsif id_map_file.exist? then
      option[:id_map] = YAML.load_file(option[:id_map])
    end
  end

  # https://qiita.com/TeQuiLayy/items/a74f928426dcb013e1cd
  def google(word)
    #user_agent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.81 Safari/537.36"
    user_agent = "(｀・ω・´)" # not to load images(?)

    search_url = "https://www.google.co.jp/search?hl=jp&gl=JP&"
    query = URI.encode_www_form(q: word)
    search_url += query

    charset = nil

    html = URI.open(search_url, 'User-Agent' => user_agent) { |f|
        charset = f.charset
        f.read
    }

    parsed = Oga.parse_html(
      html.encode("UTF-16BE", "UTF-8", :invalid => :replace, :undef => :replace, :replace => '?')
          .encode("UTF-8"))
    return parsed.xpath("//div[@id='main']").first.to_xml

  end

  def search(word, debug=false)
    if debug then
      puts "search: #{word}"
      #sleep 1
      html = Oga.parse_html(File.read("public/test2.html").encode("UTF-16BE", "UTF-8", :invalid => :replace, :undef => :replace, :replace => '?').encode("UTF-8"))
      main = html.xpath("//div[@id='main']").first

      return main.to_xml
    else
      return google(word)
    end
  end

  def load_tags(csv_path)
    return CSV.read(csv_path).map{|s, e, title, artist|
      [s.to_f, e.to_f, title, artist]
    }
  end

  def ensure_dir(app, artist, filename)
    name = filename.basename(filename.extname)

    dir = app.option[:det_root] / artist / "identified" / name
    tags_dir = dir / "tags"

    dir.mkdir if not dir.exist?
    tags_dir.mkdir if not tags_dir.exist?

    return dir, tags_dir
  end

  def save_tags(app, artist, filename, tags)
    dir, tags_dir = ensure_dir(app, artist, filename)

    csv = tags.map(&:to_csv).join
    ext = TAGS_FILE.extname

    File.write(dir / TAGS_FILE, csv)
    File.write(tags_dir / "#{TAGS_FILE.basename(ext)}_#{DateTime.now.iso8601}#{ext}", csv)
  end

  def upload_tags(app, artist: "", tags: [], filename: "", key: "")
      puts("tags: #{tags}, file:#{filename}, key:#{key}")
      Utils.save_tags(app, artist, Pathname(filename), tags)
      return tags.size.to_s

      info = app.list[vid.to_sym]

      if info && info.key?(:tagging_lock) && info[:tagging_lock] != key then # locked but invalid lock
        ws.send("Invalid lock #{key}")
      else # allow even if no locked
        Utils.save_tags(vid, tags)
        ws.send(tags.size.to_s)
      end
  end

  def lock(app, lock: "", artist: "", filename: "")
    filename = Pathname(filename)
    song_name = filename.basename(filename.extname).to_s.to_sym
    artist = artist.to_sym
    info = App.list[artist]&.[](song_name)
    puts "lock #{artist}:#{song_name} #{lock}"
    #pp App.list[artist]

    if info && !info&.key?(:tagging_lock) then

      info[:tagging_lock] = lock
      Utils.save_list(App.list)
      return true, lock
    end

    return true, lock if info&.[](:tagging_lock) == lock

    return false, "lock failed"
  end

  def unlock(app, unlock: "", artist: "", filename: "")
    filename = Pathname(filename)
    song_name = filename.basename(filename.extname).to_s.to_sym
    artist = artist.to_sym
    info = App.list[artist]&.[](song_name)
    puts "unlock #{artist}:#{song_name} #{unlock}"

    if info && info[:tagging_lock] == unlock then
      info.delete(:tagging_lock)
      Utils.save_list(App.list)
      return true, unlock
    end
    return false, "unlock failed"
  end

  def remove_bundler(ex)
    ex.backtrace.select{|line| not line.include?("bundle")}
  end

  def load_list(det_root)
    list = {}
    list = YAML.unsafe_load_file(LIST_FILE) if LIST_FILE.exist?
    return renew_list(det_root, list)
  end

  def renew_list(det_root, list)
    det_root.glob("*/").each{|dir_artist|

      artist = dir_artist.basename.to_s.to_sym
      song_list = list[artist] || {}

      sound_files = det_root.glob("#{artist}/*.*")
      det_root.glob("#{artist}/identified/*/").each{|song_dir|
        name = song_dir.basename.to_s.to_sym
        song_data = song_list[name] || {}

        song_data[:has_detections] = (song_dir / "#{name}.csv").exist?
        song_data[:has_tags]       = (song_dir / TAGS_FILE).exist?
        if song_data[:has_tags] then
          song_data[:last_modified]  = File.mtime(song_dir / TAGS_FILE)
        else
          song_data.delete(:last_modified)
        end
        song_data[:extname]        = sound_files.select{|file|
          ext = file.extname.to_s
          file.basename.to_s.include?(name.to_s) && MEDIA_FILES.map{|media_ext| ext.downcase == ".#{media_ext}"}.any?
        }.first&.extname

        song_list[name] = song_data
      }
      list[artist] = song_list

    }
    list
  end

  def save_list(list)
    File.write(LIST_FILE, list.to_yaml)
  end

  def decode_videoinfo(item)
    item2 = {**item}
    item2[:duration]     = in_seconds(item2[:duration])
    item2[:published_at] = item2[:published_at].iso8601
    return item2
  end

  # https://gist.github.com/natritmeyer/b04e219f63644948d9be
  def in_seconds(raw_duration)
    match = raw_duration.match(/PT(?:([0-9]*)H)*(?:([0-9]*)M)*(?:([0-9.]*)S)*/)
    hours   = match[1].to_i
    minutes = match[2].to_i
    seconds = match[3].to_f
    seconds + (60 * minutes) + (60 * 60 * hours)
  end
end

