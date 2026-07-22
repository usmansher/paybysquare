<?php

declare(strict_types=1);

namespace PayBySquare\Laravel\Facades;

use PayBySquare\Laravel\PayBySquareManager;
use Illuminate\Support\Facades\Facade;

/**
 * @method static string payload(\PayBySquare\Payment|array $payment)
 * @method static string qrSvg(\PayBySquare\Payment|array $payment, int $size = 256)
 *
 * @see \PayBySquare\Laravel\PayBySquareManager
 */
class PayBySquare extends Facade
{
    protected static function getFacadeAccessor(): string
    {
        return PayBySquareManager::class;
    }
}
