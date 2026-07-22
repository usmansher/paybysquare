<?php

declare(strict_types=1);

namespace PayBySquare\Laravel;

use Composer\InstalledVersions;
use Illuminate\Foundation\Console\AboutCommand;
use Illuminate\Support\Facades\Blade;
use Illuminate\Support\ServiceProvider;

class PayBySquareServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__ . '/../config/paybysquare.php', 'paybysquare');

        $this->app->singleton(PayBySquareManager::class, function ($app) {
            return new PayBySquareManager($app['config']);
        });
    }

    public function boot(): void
    {
        $this->loadViewsFrom(__DIR__ . '/../resources/views', 'paybysquare');

        Blade::component('paybysquare-qr', View\Components\Qr::class);

        if ($this->app->runningInConsole()) {
            $this->publishes([
                __DIR__ . '/../config/paybysquare.php' => config_path('paybysquare.php'),
            ], 'paybysquare-config');

            $this->publishes([
                __DIR__ . '/../resources/views' => resource_path('views/vendor/paybysquare'),
            ], 'paybysquare-views');

            AboutCommand::add('Pay By Square', fn () => [
                'Version' => InstalledVersions::getPrettyVersion('paybysquare/laravel') ?? 'dev',
            ]);
        }
    }
}
