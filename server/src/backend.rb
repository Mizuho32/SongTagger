# typed: true

require 'pathname'
require 'csv'
require 'date'
require 'yaml'
require 'date'
require 'open3'

require 'sorbet-runtime'

module Utils
  extend T::Sig
  extend self
  include Kernel

  # <host addr> <proxy addr> <det_root> <tagging_cache_root> <id_map.yaml path>
  # audio "backend" but it works as front
  sig { params(bind: String, port: Integer, option: Hash)
    .returns([Integer,  T::Hash[Symbol, T.any(IO, Thread)]]) }
  def init_audiobackend(bind, port, option)
    backend_path = Pathname("bin/audio_backend")
    if backend_path.exist? then

        audio_backend_port = port
        port = port + 1
        audio_backend_cmd = "#{backend_path} #{bind}:#{audio_backend_port} localhost:#{port} #{option[:det_root]} #{option[:tagging_cache_root]} #{option[:id_map]}"
        io, thread = async_run2(audio_backend_cmd) do |line|
            print("AB: #{line}")
        end

       return port, {io: io, thread: thread}
    else
        return port, {}
    end
  end

  sig { params(command: String, callback: T.proc.params(arg0: String).void).returns([IO, Thread]) }
  def async_run2(command, &callback)
    io_ret = T.let(IO.popen(command, err: [:child, :out]), IO)
    #io_ret = T.let(nil, T.nilable(IO))
    thread = Thread.new {
      begin
        puts "AB start #{io_ret.class}, #{io_ret.pid}"
        while (line = io_ret.gets)
            callback.call(line)
        end
        puts "Bye audio backend"
      rescue StandardError => ex
        puts ex.message, ex.backtrace&.join
      end
    }
    
    return io_ret, thread
  end

end

#out, err, status = Open3.capture3(command)
#if !status.exitstatus&.zero? then
#    puts out, err
#    no_erro = false
#end