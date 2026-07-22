<?php

declare(strict_types=1);

namespace PayBySquare\Laravel\Tests;

final class PackagingTest extends TestCase
{
    public function testAboutCommandIncludesPackageSection(): void
    {
        $this->artisan('about')
            ->expectsOutputToContain('Pay By Square')
            ->assertSuccessful();
    }

    public function testConfigIsPublishable(): void
    {
        $target = config_path('paybysquare.php');
        @unlink($target);

        $this->artisan('vendor:publish', ['--tag' => 'paybysquare-config'])
            ->assertSuccessful();

        $this->assertFileExists($target);
        @unlink($target);
    }

    public function testViewsArePublishable(): void
    {
        $target = resource_path('views/vendor/paybysquare/components/qr.blade.php');

        $this->artisan('vendor:publish', ['--tag' => 'paybysquare-views'])
            ->assertSuccessful();

        $this->assertFileExists($target);
        @unlink($target);
    }
}
