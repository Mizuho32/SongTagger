#!/usr/bin/env ruby
# coding: utf-8


require 'sqlite3'

def modify_user_props(db, user_id, key, value)
  db.execute('INSERT INTO user_props (user_id, key, value) VALUES (?, ?, ?)', [user_id, key, value])
end

def modify_db(db, user_name, artist_name)
	user_id = db.get_first_value('SELECT id FROM user WHERE user_name = ?', user_name)
	puts "#{user_name} is #{user_id}"

	if user_id
	  # user_propsテーブルにデータを挿入
	  key = "filter"
	  value = artist_name
		modify_user_props(db, user_id, "filter", artist_name)
		modify_user_props(db, user_id, "filter_accept", ?t)
	  puts "user_propsテーブルにデータを挿入しました: user_id=#{user_id}"
	else
	  puts "user_nameが一致するユーザーが見つかりませんでした。"
	end
end

# ARGV: db path, user_name, artist_name
exit(2) if ARGV.size != 3

db_path, user_name, artist_name = ARGV

begin
	# SQLite3データベースに接続
	db = SQLite3::Database.new db_path

	modify_db(db, user_name, artist_name)

	# データベースを閉じる
	db.close

rescue StandardError => ex
  puts(ex.message, ex.backtrace.join("\n"))
  db.close
end
