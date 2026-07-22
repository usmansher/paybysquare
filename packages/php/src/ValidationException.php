<?php

declare(strict_types=1);

namespace PayBySquare;

use InvalidArgumentException;

final class ValidationException extends InvalidArgumentException
{
    public function __construct(
        string $message,
        public readonly string $field,
    ) {
        parent::__construct($message);
    }
}
