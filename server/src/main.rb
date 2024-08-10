# typed: true

require 'open-uri'
require 'json'
require 'csv'
require 'date'
require 'mime/types'

#require 'sinatra/reloader' if development?
require 'oga'
require 'sinatra'
require "sinatra/json"
require 'sinatra-websocket'
require 'rack'

require_relative 'utils'
require_relative 'song_utils'

#use Rack::Chunked
#use Rack::ContentLength

if !defined?(NEWDET) and development? then
class Sinatra::Base
  class << self
    alias_method :original_get, :get

    def get(path, opts = {}, &block)
      new_block = Proc.new do
        begin
          instance_eval(&block)
        rescue StandardError => ex
          backtrace = ex.backtrace&.select{|line| !line.include?("bundle")}
          puts ex.message, backtrace&.join("\n")
          #raise ex
        end
      end

      original_get(path, opts, &new_block)
    end
  end
end
end
NEWDET=true


class App < Sinatra::Base

  configure :development do
    #if not Utils::DATA_DIR.each_filename.map{|f| f == "test"}.any? then
    #  Utils::DATA_DIR = Pathname("test") / Utils::DATA_DIR
    #end
    #register Sinatra::Reloader

    require "sinatra/reloader"
    register Sinatra::Reloader

    get '/restart' do
      App.restart = true
      App.quit!
    end

    get '/reload' do
      Pathname("src/").glob("*.rb")
        .select{|file| file.basename.to_s != "server.rb"}
        .each{|file|
          puts "reload #{file}"
          begin
            load file.to_s
          rescue StandardError, LoadError => ex
            puts "  load #{file} error:\n#{ex.message}"
          end
        }.all?
    end
  end

  class << self
    attr_reader :option, :args, :mutex
    attr_accessor :restart, :list
    def run!(opt, **args)
      @option = opt
      @args   = args
      @list   = Utils.load_list(@option[:det_root])
      #pp @list
      @restart = false
      @mutex = Thread::Mutex.new()
      super(**args)
    end
  end

  get '/audio' do
    file_path = App.option[:det_root] / params["artist"] / params["filename"]
    halt 404 unless file_path.exist?

    m4a_file_path = App.option[:tagging_cache_root] / params["artist"] / "#{file_path.basename(file_path.extname)}.m4a"
    file_path = m4a_file_path if m4a_file_path.exist?

    content_type (MIME::Types.type_for(file_path.to_s).first.content_type)
    #puts "RANGE", request.env['HTTP_RANGE']

    if env['HTTP_RANGE']
      ranges = Rack::Utils.get_byte_ranges(env['HTTP_RANGE'], File.size(file_path))
      halt 416 unless ranges && ranges.length == 1
      range = ranges[0]

      status 206
      headers 'Content-Range' => ("bytes #{range.begin}-#{range.end}/#{File.size(file_path)}")
      headers 'Accept-Ranges' => 'bytes'
      headers 'Content-Length' => ((range.end - range.begin + 1).to_s)

      # body content_range
      stream do |out|
        App.mutex.synchronize {
          File.open(file_path, 'rb') do |file|
            file.seek(range.begin)
            bytes_to_read = range.end - range.begin + 1
            while bytes_to_read > 0
              chunk_size = [8 * 1024, bytes_to_read].min
              buffer = file.read(chunk_size)
              break unless buffer
              out << buffer
              bytes_to_read -= buffer.size
            end
          end
        }
      end
    else
      send_file file_path
    end
  end


  get '/detections' do
    filename = Pathname(params["filename"])
    name = filename.basename(filename.extname)
    csv_file_name = if params.key?("tagged") then "tags.csv" else "#{name}.csv" end
    dir = App.option[:det_root] / params["artist"] / "identified" / name

    file_path =  dir / csv_file_name
    file_path = dir / "#{name}" if !file_path.exist?

    #p file_path

    unless file_path.exist?
      status 404
      body json([])
    else
      det_data = CSV.read(file_path)
      json_data = det_data.map{|line|
        tmp = %i[start end title artist].each_with_index.map{|el, i| [el, line[i]]}
        Hash[tmp]
      }
      json(json_data)
    end
  end

  get '/extract' do
    artist = params["artist"]
    file_path = App.option[:det_root] / artist / params["filename"]
    cache_dir = App.option[:cache_root]

    name = file_path.basename(file_path.extname)
    tags_csv = App.option[:det_root] / artist / "identified" / name / "tags.csv"

    if !tags_csv.exist? then
      status 404
      body "No tag"
    else
      SongUtils.extract_songs(artist, Utils.load_tags(tags_csv), file_path, cache_dir)
      body "processing..."
    end
  end

  get '/extracts' do
    artist = params["artist"]
    artist_exists = App.option[:det_root] / artist

    if artist_exists.directory? then
      cache_dir = App.option[:cache_root]

      Thread.new {
      begin
      App.list[artist.to_sym].each{|filestemname, song_info|
        filename = "#{filestemname}#{song_info[:extname]}"
        file_path = App.option[:det_root] / artist / filename

        tags_csv = App.option[:det_root] / artist / "identified" / filestemname.to_s / "tags.csv"
        if tags_csv.exist? then
            #puts(artist, tags_csv, file_path, cache_dir)
            SongUtils.extract_songs(artist, Utils.load_tags(tags_csv), file_path, cache_dir)
        end
      }
      rescue StandardError => ex
       puts "#{ex.message}\n#{ex.backtrace&.join("\n")}"
      end
      }
      body "processing..."
    else
      status 404
      body "No artist"
    end
  end


  get '/list_renew' do
    App.list = Utils.renew_list(App.option[:det_root], App.list)
    Utils.save_list(App.list)
    pp App.list
    "list renewed"
  end

  get "/songlist" do
    artist = params["artist"].to_sym
    if !App.list.key?(artist) then
      json([])
    else
      song_list = App.list[artist]
        .select{|name, info|
          info[:has_detections]
        }.map{|name, info|
          stream = {name: name, extname: info[:extname], taggingLock: !!info[:tagging_lock]}
          stream[:lastModified] = info[:last_modified].iso8601 if info.key?(:last_modified)
          stream
        }
      json(song_list)
    end
  end

  get '/lock' do
    query = params.map{|k,v| [k.to_sym, v]}.to_h
    status, value = if query.key?(:lock) then
      Utils.lock(App, **query)
    else
      Utils.unlock(App, **query)
    end
    json({status: status, value: value})
  end

  get '/' do
    is_mobile = params.key?("mobile")
    video_id, segments = Utils.load_segments(params["video_id"].to_s)

    video_info = App.list[video_id.to_sym]
    if video_info then
      tagging_lock = video_info[:tagging_lock]
      unlock = (not params["lock"].nil? and params["lock"] == tagging_lock)
      #p params["lock"], tagging_lock
      return erb(:now_tagging, locals: video_info) if tagging_lock.is_a?(String) and not unlock # locked
    end

    locals = {
      :css =>  is_mobile ? "mobile.css" : "style.css",
      is_mobile: is_mobile, raw_times: segments, video_id: video_id
    }

    erb :index, locals: {
      **locals,
      search: erb(:search, locals: locals),
      table: erb(:table, locals: locals)
    }
  end

  get '/tagging' do
    Utils.renew_list(App.list) # FIXME: should not access disk
    erb :manual_list, locals: {
      is_mobile: params.key?("mobile") ? "&mobile=1" : "",
      list: App.list.values
        .select{|item| item[:has_segments] and not item[:segments_is_empty] }
        .sort{|l, r|
          l, r = [l,r].map{|term| %i[has_tags tagging_lock].map{|k| term[k] ? 1 : 0}.sum}
          l <=> r
        }
    }
  end

  get '/tagcommenting' do

    @tagcom_list =
    if not defined? @tagcom_list then

      list =
      if App.option[:list_with_comments] then
        Utils.load_list(App.option[:list_with_comments])
          .select{|k, v| not v[:comments].join.include?(App.option[:sheet_link]) }
          .map{|k, v| App.list[v[:video_id].to_sym]}
          .compact
      else
        App.list.values
      end

      list.select{|item| item[:has_tags] }
    end

    if params.empty? then
      erb :comment_list, locals: {
        list: @tagcom_list
      }
    else
      vid = params["video_id"]
      list = @tagcom_list
      tags = Utils.load_tags(vid)
      idx  = list.each_with_index.select{|el, i| el[:video_id] == vid}.first.last
      current = list[idx]
      prev, nxt = list[idx+1], list[idx-1]

      erb :tagcomment, locals: {
        tags: tags.select{|st,en,name,artist| !name.empty? && !artist.empty?},
        current: current, prev: prev, nxt: nxt,
        sheet_link: App.option[:sheet_link],
      }
    end
  end

  get '/locked' do
    App.list.values.select{|item| item[:lock]}.map{|item| Utils.decode_videoinfo(item)}.to_json
  end

  get '/video2process' do
    yet_processed = App.list.values.select{|item|
      not item[:has_segments] and not item[:lock]
    }.first&.dup || {}
    id = yet_processed[:video_id]&.to_sym
    #pp App.list.values

    if id then
      if params.key?("lock") then
        App.list[id][:lock] = DateTime.now
        Utils.save_list(App.option[:list], App.list)
      end

      return Utils.decode_videoinfo(yet_processed).to_json
    else
      return "{}"
    end
  rescue StandardError => ex
    status 500
    msg = "#{ex.message}\n#{Utils.remove_bundler(ex).join("\n")}"
    puts msg
    {error: msg}.to_json
  end

  post "/segments" do
   request.body.rewind  # 既に読まれているときのため
   data = JSON.parse request.body.read
   id = data["video_id"].to_sym
   puts data

   App.list[id] = {video_id: id} if not App.list[id]
   App.list[id][:lock] = false if App.list[id][:lock]

   txt =
   if data["segments"].empty? then
     App.list[id][:segments_is_empty] = true
     status 501
     "Empty timestamp"
   else
     App.list[id].delete(:segments_is_empty) if App.list[id].has_key?(:segments_is_empty)
     status 201
     "OK"
   end
   Utils.save_segments(data["video_id"], data["segments"])
   App.list[id][:has_segments] = true

   Utils.save_list(App.option[:list], App.list)

   txt
  rescue StandardError => ex
    status 500
    err = "#{ex.message}\n#{Utils.remove_bundler(ex).join("\n")}"
    puts err
    err
  end

  get '/websocket' do
    if request.websocket?
      request.websocket { |ws|

        ws.onopen do
          puts "WS open #{ws}"
          #settings.sockets << ws
        end

        ws.onmessage do |msg|
          query = JSON.parse(msg, symbolize_names: true)
          puts "WS: #{query}"

          if query.key? :search then
            word = query[:search].to_s
            if App.option[:debug] then
              puts "search: #{word}"
              #sleep 1
              html = Oga.parse_html(File.read("public/test2.html").encode("UTF-16BE", "UTF-8", :invalid => :replace, :undef => :replace, :replace => '?').encode("UTF-8"))
              main = html.xpath("//div[@id='main']").first

              ws.send(main.to_xml)
            else
              ws.send(Utils.google(word))
            end
          elsif query.key? :tags then
            ret = Utils.upload_tags(App, **query)
            ws.send({status: true, value: ret}.to_json)
            App.list = Utils.renew_list(App.option[:det_root], App.list)

          elsif query.key? :lock then
            puts ("lock #{query}")
            status, value = Utils.lock(App, **query)
            ws.send({statu: status, value: value}.to_json);
             
          elsif query.key? :unlock then
            puts ("unlock #{query}")
            status, value = Utils.unlock(App, **query)
            ws.send({statu: status, value: value}.to_json);
            
          end
        rescue StandardError => ex
          puts ex.message, Utils.remove_bundler(ex).join("\n")
          ws.send({status: "error", value: ex.message}.to_json);

          #settings.sockets.each do |s|
          #  s.send(msg)
          #end
        end

        ws.onclose do
          puts "WS: closed #{ws}"
          #settings.sockets.delete(ws)
        end

      }
    end
  end

end
