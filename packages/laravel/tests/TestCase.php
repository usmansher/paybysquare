<?php

declare(strict_types=1);

namespace PayBySquare\Laravel\Tests;

use PayBySquare\Laravel\PayBySquareServiceProvider;
use Orchestra\Testbench\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /**
     * @return array<int, class-string>
     */
    protected function getPackageProviders($app): array
    {
        return [
            PayBySquareServiceProvider::class,
        ];
    }
}
