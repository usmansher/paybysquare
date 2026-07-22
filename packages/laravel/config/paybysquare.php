<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | Default currency
    |--------------------------------------------------------------------------
    |
    | ISO 4217 currency code applied when the caller does not provide one.
    |
    */
    'currency' => env('PAYBYSQUARE_CURRENCY', 'EUR'),

    /*
    |--------------------------------------------------------------------------
    | Default IBAN
    |--------------------------------------------------------------------------
    |
    | Beneficiary IBAN applied when the caller does not provide one.
    |
    */
    'iban' => env('PAYBYSQUARE_IBAN'),

    /*
    |--------------------------------------------------------------------------
    | Default SWIFT/BIC
    |--------------------------------------------------------------------------
    |
    | Beneficiary SWIFT/BIC applied when the caller does not provide one.
    |
    */
    'swift' => env('PAYBYSQUARE_SWIFT', ''),

    /*
    |--------------------------------------------------------------------------
    | Default beneficiary name
    |--------------------------------------------------------------------------
    |
    | Beneficiary name applied when the caller does not provide one.
    |
    */
    'beneficiary_name' => env('PAYBYSQUARE_BENEFICIARY_NAME'),

];
