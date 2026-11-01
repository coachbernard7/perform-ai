<?php
declare(strict_types=1);

// Copy outside public_html as ../perform-ai-private/accounts.php.
// Generate each bcrypt hash with: php -r 'echo password_hash("CHANGE_THIS", PASSWORD_DEFAULT), PHP_EOL;'
return [
    'accounts' => [
        [
            'id' => 'admin-1',
            'username' => 'adminusername',
            'email' => 'admin@example.com',
            'name' => 'Administrator',
            'role' => 'admin',
            // Owner-authorised accounts may use permanent_free_trial.
            // Self-registered accounts are written privately as pending_manual_verification.
            'membership' => 'permanent_free_trial',
            'phone' => '',
            'password_hash' => 'REPLACE_WITH_BCRYPT_HASH',
        ],
    ],
];
