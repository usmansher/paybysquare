<?php

declare(strict_types=1);

namespace PayBySquare\Laravel;

use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use PayBySquare\Payment;
use PayBySquare\PayBySquare;
use Illuminate\Contracts\Config\Repository as ConfigRepository;
use RuntimeException;

class PayBySquareManager
{
    public function __construct(
        private readonly ConfigRepository $config,
    ) {
    }

    /**
     * Generate the Pay By Square payload string for a payment.
     *
     * Array input is merged with the configured defaults (iban, swift,
     * currency, beneficiaryName) before being validated by the library.
     *
     * @param Payment|array<string, mixed> $payment
     */
    public function payload(Payment|array $payment): string
    {
        if (is_array($payment)) {
            $payment = Payment::fromArray($this->applyDefaults($payment));
        }

        return PayBySquare::generatePayload($payment);
    }

    /**
     * Render the payment as an inline SVG QR code.
     *
     * Requires bacon/bacon-qr-code to be installed.
     *
     * @param Payment|array<string, mixed> $payment
     * @param int $size Rendered width/height in pixels.
     */
    public function qrSvg(Payment|array $payment, int $size = 256): string
    {
        if (!class_exists(Writer::class)) {
            throw new RuntimeException(
                'Rendering QR codes as SVG requires the "bacon/bacon-qr-code" package. '
                . 'Install it with: composer require bacon/bacon-qr-code',
            );
        }

        $payload = $this->payload($payment);

        $renderer = new ImageRenderer(
            new RendererStyle($size),
            new SvgImageBackEnd(),
        );

        return (new Writer($renderer))->writeString($payload);
    }

    /**
     * Merge config defaults into an array payment for keys the caller omitted.
     *
     * @param array<string, mixed> $payment
     * @return array<string, mixed>
     */
    private function applyDefaults(array $payment): array
    {
        $defaults = [
            'iban' => $this->config->get('paybysquare.iban'),
            'swift' => $this->config->get('paybysquare.swift'),
            'currency' => $this->config->get('paybysquare.currency'),
            'beneficiaryName' => $this->config->get('paybysquare.beneficiary_name'),
        ];

        $merged = $payment;
        foreach ($defaults as $key => $value) {
            if (!array_key_exists($key, $merged) && $value !== null) {
                $merged[$key] = $value;
            }
        }

        return $merged;
    }
}
