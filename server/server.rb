# typed: true

require 'pathname'
require 'optparse'


OPTION = option = {
  backend: "thin",
  port: 8000
}

parser = OptionParser.new
parser.on("--det-dir detection dir root", "root dir of detection dirs") {|v| option[:det_root] = Pathname(v) }
parser.on("--cache-dir cache dir root", "Navidrome media file cache dir root") {|v| option[:cache_root] = Pathname(v) }
parser.on("--tagging-cache-dir taggin cache dir root", "Media file cache for tagging root dir") {|v| option[:tagging_cache_root] = Pathname(v) }
parser.on("--id-map id_map.yaml", "id map config") {|v| option[:id_map] = Pathname(v) }
parser.on('-d', "--debug", "Debug mode") { option[:debug] = true }
parser.on('-s google sheet id and gid', "--sheet-link", "id and gid of Google sheet for commenting") {|v| option[:sheet_link] = v }
parser.on('--lc list.yaml', "--list-with-comments", "List with video comments") {|v| option[:list_with_comments] = v }
parser.on('-b', "--backend [thin]", "puma thin webrick") {|v| option[:backend] = v }
parser.on('-p', "--port [8000]", "port") {|v| option[:port] = v }
parser.on("--performance", "Performance check") {|v| option[:performance] = true }

parser.parse!(ARGV)

# For sinatra help
# if not ARGV.map{|el| el =~ /h(elp)?/}.any? then
  # begin
    # parser.parse!(ARGV)
  # rescue StandardError
    # STDERR.puts parser
    # exit 1
  # end
# else
  # puts parser.help
# end

require_relative 'src/profile' if option[:performance]

require_relative 'src/utils'
require_relative 'src/main'

trap(:INT) {
  App.stop!
}

Utils.init(option)

catch(:end) do
  loop do
    App.run!(
      option,
      public_folder: (Pathname(__dir__) / "public"),
      views:         (Pathname(__dir__) / "views"),
      server: option[:backend],
      sockets: [],
      port: option[:port].to_i,
      bind: "0.0.0.0",
    )
    throw :end unless App.restart
  end
end

puts "End"