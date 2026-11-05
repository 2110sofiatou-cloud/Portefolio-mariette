<?php
/* =========================================================
   Mariette Mandjan : traitement du formulaire de contact
   Reçoit le formulaire de la section « Collaborer », vérifie les
   données et envoie le message dans la boîte mail de Mariette.
   ========================================================= */
declare(strict_types=1);

/* ---------- Réglages ---------- */
$CONFIG = [
    'to'          => 'mariettemandjan40@gmail.com',  // boîte qui reçoit les messages
    'from'        => '',                             // expéditeur technique ; vide = no-reply@<domaine du site>
    'site'        => 'Portfolio Mariette Mandjan',
    'mode'        => getenv('CONTACT_MODE') ?: 'mail', // 'log' : écrit le message dans un fichier au lieu de l'envoyer (tests locaux)
    'min_seconds' => 3,                              // un humain met plus de 3 s à remplir le formulaire
    'cooldown'    => 30,                             // délai minimal entre deux envois depuis un même navigateur
];

$SUBJECTS = [
    'pedagogie'  => 'Pédagogie innovante et éducation environnementale',
    'eau'        => "Ingénierie rurale et maîtrise de l'eau",
    'pertes'     => 'Négociations sur les Pertes et Préjudices',
    'plan'       => 'Plan post-COP',
    'associatif' => 'Vie associative',
    'autre'   => 'Autre demande',
];

$isAjax = ($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') === 'fetch';

/* Réponse JSON pour le formulaire (fetch), page simple sinon */
function respond(bool $ok, string $code, int $http = 200): void
{
    global $isAjax;
    http_response_code($http);
    if ($isAjax) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => $ok, 'code' => $code]);
        exit;
    }
    $msg = $ok
        ? "Merci, votre message m'a bien été transmis."
        : "L'envoi n'a pas abouti. Vous pouvez m'écrire directement à mariettemandjan40@gmail.com.";
    header('Content-Type: text/html; charset=utf-8');
    echo '<!DOCTYPE html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
       . '<title>Contact</title><body style="font-family:system-ui,sans-serif;max-width:40rem;margin:4rem auto;padding:0 1.5rem;color:#183D32">'
       . '<p>' . htmlspecialchars($msg, ENT_QUOTES, 'UTF-8') . '</p>'
       . '<p><a href="index.html#collaborer" style="color:#183D32">Retour au portfolio</a></p></body></html>';
    exit;
}

/* Une ligne : sans retour à la ligne (empêche l'injection d'en-têtes), longueur bornée */
function line(string $key, int $max): string
{
    $v = trim(preg_replace('/[\r\n\t]+/', ' ', (string)($_POST[$key] ?? '')));
    return mb_substr($v, 0, $max, 'UTF-8');
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    respond(false, 'method', 405);
}

/* ---------- Filtres anti-robots : réponse « succès » sans envoi ---------- */
if (trim((string)($_POST['website'] ?? '')) !== '') {
    respond(true, 'ok');
}
$ts = (string)($_POST['ts'] ?? '');
if (ctype_digit($ts) && (microtime(true) * 1000 - (float)$ts) < $CONFIG['min_seconds'] * 1000) {
    respond(true, 'ok');
}

/* ---------- Données ---------- */
$name    = line('name', 100);
$email   = line('email', 150);
$org     = line('organisation', 150);
$subject = line('subject', 20);
$lang    = line('lang', 2) === 'en' ? 'en' : 'fr';
$message = str_replace(["\r\n", "\r"], "\n", trim((string)($_POST['message'] ?? '')));
$message = mb_substr($message, 0, 5000, 'UTF-8');
$consent = ($_POST['consent'] ?? '') === '1';

$valid = mb_strlen($name, 'UTF-8') >= 2
    && filter_var($email, FILTER_VALIDATE_EMAIL) !== false
    && isset($SUBJECTS[$subject])
    && mb_strlen($message, 'UTF-8') >= 10
    && $consent;
if (!$valid) {
    respond(false, 'invalid', 422);
}

/* ---------- Limitation : un envoi toutes les 30 s par navigateur ---------- */
session_start();
if (isset($_SESSION['cf_last']) && time() - (int)$_SESSION['cf_last'] < $CONFIG['cooldown']) {
    respond(false, 'rate', 429);
}

/* ---------- Composition du message ---------- */
$host = preg_replace('/[^a-z0-9.-]/i', '', (string)($_SERVER['SERVER_NAME'] ?? 'localhost')) ?: 'localhost';
$from = $CONFIG['from'] !== '' ? $CONFIG['from'] : 'no-reply@' . $host;
$enc  = static fn(string $s): string => mb_encode_mimeheader($s, 'UTF-8', 'B', "\r\n");

$mailSubject = '[Portfolio] ' . $SUBJECTS[$subject] . ', ' . $name;
$body = "Nouveau message envoyé depuis le portfolio.\n\n"
      . "Nom : {$name}\n"
      . "E-mail : {$email}\n"
      . 'Organisation : ' . ($org !== '' ? $org : 'non précisée') . "\n"
      . "Sujet : {$SUBJECTS[$subject]}\n"
      . 'Langue du site : ' . ($lang === 'en' ? 'anglais' : 'français') . "\n\n"
      . "Message :\n{$message}\n\n"
      . "--\nPour répondre, utilisez simplement la fonction « Répondre » : la réponse ira à l'expéditeur.\n";

$headers = [
    'From: ' . $enc($CONFIG['site']) . " <{$from}>",
    'Reply-To: ' . $enc($name) . " <{$email}>",
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
];

/* ---------- Envoi ---------- */
if ($CONFIG['mode'] === 'log') {
    $entry = json_encode(['date' => date('c'), 'to' => $CONFIG['to'], 'subject' => $mailSubject,
                          'headers' => $headers, 'body' => $body], JSON_UNESCAPED_UNICODE);
    $sent = file_put_contents(sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'mariette-contact.log', $entry . "\n", FILE_APPEND) !== false;
} else {
    $params = (PHP_OS_FAMILY !== 'Windows' && $CONFIG['from'] !== '') ? '-f' . $from : '';
    $sent = @mail($CONFIG['to'], $enc($mailSubject), $body, implode("\r\n", $headers), $params);
    if (!$sent) {
        error_log('[contact.php] mail() a échoué : vérifier la configuration d\'envoi du serveur.');
    }
}

if (!$sent) {
    respond(false, 'send', 500);
}
$_SESSION['cf_last'] = time();
respond(true, 'ok');
