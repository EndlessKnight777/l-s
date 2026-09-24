<?php
/**
 * L&S Consulting — contact form handler
 * Sends submissions from contact.html to mail@lsgauteng.co.za using PHP's mail().
 * Works with cPanel's built-in mail server — no third-party service required.
 */
$recipient  = 'mail@lsgauteng.co.za';
$site_name  = 'L&S Consulting Website';
// "From" must be on the site's own domain so SPF accepts it; Reply-To is the visitor.
$from_email = 'noreply@lsgauteng.co.za';

header('Content-Type: application/json');
$raw = file_get_contents('php://input');
$json = json_decode($raw, true);
$input = is_array($json) ? $json : $_POST;
function field($input, $key) { return isset($input[$key]) ? trim(strip_tags($input[$key])) : ''; }

$name     = field($input, 'name');
$email    = field($input, 'email');
$phone    = field($input, 'phone');
$message  = field($input, 'message');
$honeypot = field($input, 'website');

if ($honeypot !== '') { echo json_encode(['success' => true]); exit; }

$errors = [];
if ($name === '')  $errors[] = 'Please enter your name.';
if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = 'Please enter a valid e-mail address.';
if ($phone === '') $errors[] = 'Please enter your phone number.';
if (!empty($errors)) { http_response_code(422); echo json_encode(['success' => false, 'error' => implode(' ', $errors)]); exit; }

// strip header-injection characters
$name  = str_replace(["\r", "\n"], ' ', $name);
$email = str_replace(["\r", "\n"], '', $email);

$subject = 'Website enquiry from ' . $name;
$body  = "New enquiry from the lsgauteng.co.za contact form:\n\n";
$body .= "Name:    $name\nE-mail:  $email\nPhone:   $phone\n\nMessage:\n" . ($message ?: '—') . "\n";
$headers = ["From: {$site_name} <{$from_email}>", "Reply-To: {$name} <{$email}>", "MIME-Version: 1.0", "Content-Type: text/plain; charset=UTF-8"];

if (@mail($recipient, $subject, $body, implode("\r\n", $headers))) {
    echo json_encode(['success' => true]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'The message could not be sent. Please e-mail mail@lsgauteng.co.za or call +27 11 463 4020.']);
}
