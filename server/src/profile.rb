require 'ruby-prof'

class CustomRubyProf < Rack::RubyProf
  def initialize(app, options = {})
    super
    @counter = 0
    @output_dir = options[:path] || 'data'
    FileUtils.mkdir_p(@output_dir) unless File.directory?(@output_dir)
  end

  #def call(env)
  #  @counter += 1
  #  timestamp = Time.now.strftime("%Y%m%d%H%M%S")
  #  index = format('%04d', @counter)
  #  profile_path = File.join(@output_dir, "profile_#{timestamp}_#{index}.html")
  #  
  #  result = RubyProf.profile do
  #    @app.call(env)
  #  end

  #  printer = RubyProf::GraphHtmlPrinter.new(result)
  #  File.open(profile_path, 'w') do |file|
  #    printer.print(file)
  #  end
  #  
  #  @app.call(env)
  #end

  def call(env)
    result = RubyProf::Profile.profile { @app.call(env) }
    
    timestamp = Time.now.strftime("%Y%m%d%H%M%S%L")
    index = format('%04d', @counter)
    path = File.join(@options[:path], "profile_#{index}.html")
    call_stack_path = File.join(@options[:path], "call_stack_#{index}.html")
    
    # Save GraphHtmlPrinter report
    File.open(path, 'wb') do |file|
      printer = RubyProf::GraphHtmlPrinter.new(result)
      printer.print(file)
    end
    
    # Save CallStackPrinter report
    File.open(call_stack_path, 'wb') do |file|
      printer = RubyProf::CallStackPrinter.new(result)
      printer.print(file)
    end

    @app.call(env)
  end
end