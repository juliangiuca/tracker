set :application, 'tracker'
set :repo_url, 'git@github.com:juliangiuca/tracker.git'

# ask :branch, proc { `git rev-parse --abbrev-ref HEAD`.chomp }

 set :deploy_to, '/data/tracker'
# set :scm, :git

# set :format, :pretty
# set :log_level, :debug
# set :pty, true

 set :linked_files, %w{config/settings.json newrelic.js}
 set :linked_dirs, %w{log}

# set :default_env, { path: "/opt/ruby/bin:$PATH" }
set :keep_releases, 3

namespace :deploy do

  desc 'Restart application'
  task :restart do
    on roles(:app), in: :sequence, wait: 5 do
      # Your restart mechanism here, for example:
      # execute :touch, release_path.join('tmp/restart.txt')
      #if test("[ -f #{shared_path}/tmp/pids/unicorn.pid ]")
        #execute "cat #{shared_path}/tmp/pids/unicorn.pid"
        #execute "kill -USR2 `cat #{shared_path}/tmp/pids/unicorn.pid`"
      #else
        #info "No unicorn process found"
      #end
    end
  end

  task :pull_down_secret_files do
    on roles(:all) do
      execute "mkdir -p /data/tracker/shared/config/"
      execute "wget --user=#{ENV['BITBUCKET_USER']} --password='#{ENV['BITBUCKET_PASSWORD']}' -q -N https://bitbucket.org/localtoast/secret-files/raw/master/tracker/settings.production.json -O /data/tracker/shared/config/settings.json"
      execute "wget --user=#{ENV['BITBUCKET_USER']} --password='#{ENV['BITBUCKET_PASSWORD']}' -q -N https://bitbucket.org/localtoast/secret-files/raw/master/tracker/newrelic.js -O /data/tracker/shared/newrelic.js"
    end
  end

  after :finishing, 'deploy:cleanup'
  before :starting, 'deploy:pull_down_secret_files'

end
