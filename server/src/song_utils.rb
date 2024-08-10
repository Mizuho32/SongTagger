# typed: true

require 'pathname'
require 'csv'
require 'date'
require 'yaml'
require 'date'
require 'open3'

require 'sorbet-runtime'

require_relative 'utils'

module SongUtils
  extend self
  include Kernel

  def time_overlap?(s1, e1, s2, e2)
    return (s2 <= e1 && e1 <= e2) || (s1 <= e2 && e2 <= s2)
  end

  def dist(a,b)
    diff = a-b
    return diff if diff >= 0
    return -diff
  end

  def extract_songs(artist, input_tags, filepath, cache_dir, same_time_thres: 0.5)
    parsed_date = DateTime.parse(filepath.basename.to_s)
    date_str = parsed_date.strftime('%Y-%m-%d')
    dir_path = cache_dir / artist / date_str

    FileUtils.mkdir_p(dir_path) if !dir_path.exist?

    tagged_csv = dir_path / "tags.csv"
    taggeds = []
    taggeds = Utils.load_tags(tagged_csv).sort{|l,r| l.first.to_f <=> r.first.to_f } if tagged_csv.exist?

    deletes = []
    adds = []
    track_size = input_tags.size

    input_tags.each_with_index{|input_tag, track_num|
      start_time, end_time, title, _ = input_tag
      next if !title

      if taggeds.empty? then
        adds.push(input_tag + [track_num])
        next
      end

      push_input_tag = T.let(true, T::Boolean)
      loop do
        tagged = taggeds.first
        if tagged.nil? then
          #adds.push(input_tag)
          break
        end

        start_old, end_old, title_old, _ = tagged

        is_overlap = time_overlap?(start_time, end_time, start_old, end_old)
        is_same = is_overlap &&
        (dist(start_time, start_old) < same_time_thres && dist(end_time, end_old) < same_time_thres) &&
        title == title_old

        if is_same then
          taggeds.shift
          push_input_tag = false
          break
        end

        if is_overlap then
          deletes.push(tagged)
          #adds.push(input_tag)
          taggeds.shift
        else
          if start_old < start_time then
            deletes.push(tagged)
            #adds.push(input_tag)
            taggeds.shift
          else
            #adds.push(input_tag)
            break
          end
        end

      end
      adds.push(input_tag + [track_num]) if push_input_tag
    }

    deletes = deletes + taggeds

    puts "Update #{filepath.basename}"
    puts "Add: #{adds.size}",    adds   .map{|el| "  " + el.join(",")}.join("\n")
    puts "Del: #{deletes.size}", deletes.map{|el| "  " + el.join(",")}.join("\n")


    Thread.new {
    no_erro = true
    begin
      deletes.each{|start_time, _, title, _|
        title = unix_safe_filename(title)
        #puts "Del #{title}"
        targets = dir_path.glob("#{title}_#{start_time.to_i}*")
        targets.each{|target|
          #puts target
          FileUtils.remove_file(target)
        }
      }
      adds.each{|start_time, end_time, title, _, track_num|

        command = 'ffmpeg'

        out_path = if filepath.extname.include?("flac") then
          dir_path / ("#{unix_safe_filename(title)}_#{start_time.to_i}" + ".m4a")
        else
          command += " -c copy"
          dir_path / ("#{unix_safe_filename(title)}_#{start_time.to_i}" + filepath.extname)
        end

        if not out_path.exist? then
            medatada = "-metadata artist='#{artist}' -metadata album='#{date_str}' -metadata title='#{title}' -metadata track='#{track_num+1}/#{track_size}'"
            command = "#{command} -i '#{filepath}' -ss #{start_time} -to #{end_time} #{medatada} '#{out_path}'"

            puts("ffmpeg: #{title}")
            #puts(command)
            #next
            out, err, status = Open3.capture3(command)
            if !status.exitstatus&.zero? then
                puts out, err
            end
        end

      }
    rescue StandardError => ex
      no_erro = false
      puts "#{ex.message}\n#{ex.backtrace&.join("\n")}"
    end

    File.write(tagged_csv, input_tags.map(&:to_csv).join) if no_erro
    puts "DONE"

    }

    return
  end

  def unix_safe_filename(name)
    return name.gsub("/", "／")
  end
end