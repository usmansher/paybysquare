<?php

declare(strict_types=1);

namespace PayBySquare\Laravel\View\Components;

use PayBySquare\Payment;
use PayBySquare\Laravel\PayBySquareManager;
use Illuminate\Contracts\View\View;
use Illuminate\View\Component;

class Qr extends Component
{
    /**
     * @param Payment|array<string, mixed> $payment
     */
    public function __construct(
        private readonly PayBySquareManager $manager,
        public Payment|array $payment,
        public int $size = 256,
    ) {
    }

    public function render(): View
    {
        return view('paybysquare::components.qr', [
            'svg' => $this->manager->qrSvg($this->payment, $this->size),
        ]);
    }
}
