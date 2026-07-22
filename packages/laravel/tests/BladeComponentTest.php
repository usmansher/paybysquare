<?php

declare(strict_types=1);

namespace PayBySquare\Laravel\Tests;

use Illuminate\Foundation\Testing\Concerns\InteractsWithViews;
use Illuminate\Support\Facades\Route;

final class BladeComponentTest extends TestCase
{
    use InteractsWithViews;

    private const PAYMENT = [
        'amount' => 12.34,
        'iban' => 'SK7700000000000000000000',
        'beneficiaryName' => 'Example s.r.o.',
        'date' => '2026-01-15',
    ];

    public function testComponentRendersInlineSvg(): void
    {
        $view = $this->blade(
            '<x-paybysquare-qr :payment="$payment" :size="200" />',
            ['payment' => self::PAYMENT],
        );

        $view->assertSee('<svg', false);
    }

    public function testComponentRendersThroughRoute(): void
    {
        Route::get('/qr-test', function () {
            return view('paybysquare-test::page', ['payment' => self::PAYMENT]);
        });

        view()->addNamespace('paybysquare-test', __DIR__ . '/views');

        $this->get('/qr-test')
            ->assertOk()
            ->assertSee('<svg', false);
    }
}
