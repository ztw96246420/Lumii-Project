const fs = require('fs');
const path = require('path');

const stitchFiles = [
  'discover.html',
  'profile.html',
  'map-search-filter.html',
  'notifications.html',
  'upload-no-pet.html',
  'ai-result-cn.html',
  'message-send-failed.html',
  'health-memo.html',
  'vaccine-plan.html',
  'map.html',
  'greeting-sheet.html',
  'pet-chat.html',
  'pet-chat-states.html',
  'pet-chat-overview.html',
];

function ent(hexCodes) {
  return hexCodes
    .trim()
    .split(/\s+/)
    .map((code) => `&#x${code};`)
    .join('');
}

function chars(hexCodes) {
  return String.fromCodePoint(...hexCodes.trim().split(/\s+/).map((code) => parseInt(code, 16)));
}

function escaped(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function textRegex(hexCodes) {
  return new RegExp(escaped(chars(hexCodes)), 'g');
}

const replacements = [
  [/>(\s*)Discover(\s*)</g, `>$1${ent('53d1 73b0')}$2<`],
  [/>(\s*)All Pets(\s*)</g, `>$1${ent('5168 90e8 5ba0 7269')}$2<`],
  [/>(\s*)Dogs(\s*)</g, `>$1${ent('72d7 72d7')}$2<`],
  [/>(\s*)Cats(\s*)</g, `>$1${ent('732b 54aa')}$2<`],
  [/>(\s*)Want to Meet(\s*)</g, `>$1${ent('60f3 7ea6 905b')}$2<`],
  [/>(\s*)Online(\s*)</g, `>$1${ent('5728 7ebf')}$2<`],
  [/>(\s*)Say Hello(\s*)</g, `>$1${ent('6253 62db 547c')}$2<`],
  [/>(\s*)Pet(\s*)</g, `>$1${ent('5ba0 7269')}$2<`],
  [/>(\s*)Nearby(\s*)</g, `>$1${ent('53d1 73b0')}$2<`],
  [/>(\s*)Map(\s*)</g, `>$1${ent('5730 56fe')}$2<`],
  [/>(\s*)Messages(\s*)</g, `>$1${ent('6d88 606f')}$2<`],
  [/>(\s*)Profile(\s*)</g, `>$1${ent('6211 7684')}$2<`],
  [/>(\s*)Settings(\s*)</g, `>$1${ent('8bbe 7f6e')}$2<`],
  [/>(\s*)Cuddly(\s*)</g, `>$1${ent('4eb2 4eba')}$2<`],
  [/>(\s*)Indoor Only(\s*)</g, `>$1${ent('5ba4 5185 4e3a 4e3b')}$2<`],
  [/>(\s*)At the park(\s*)</g, `>$1${ent('5728 516c 56ed')}$2<`],
  [/Ragdoll • 2 yrs/g, `${ent('5e03 5076 732b')} · 2${ent('5c81')}`],
  [/Ragdoll · 3 Yrs/g, `${ent('5e03 5076 732b')} · 3${ent('5c81')}`],
  [/>(\s*)Hi, Alex!(\s*)</g, `>$1${ent('55e8 ff0c')}Alex${ent('ff01')}$2<`],
  [/>(\s*)Manage your furry friends(\s*)</g, `>$1${ent('7ba1 7406 4f60 7684 6bdb 5b69 5b50')}$2<`],
  [/>(\s*)Health Overview(\s*)</g, `>$1${ent('5065 5eb7 6982 89c8')}$2<`],
  [/>(\s*)Next Vax(\s*)</g, `>$1${ent('4e0b 6b21 75ab 82d7')}$2<`],
  [/>(\s*)View Schedule(\s*)</g, `>$1${ent('67e5 770b 8ba1 5212')}$2<`],
  [/>(\s*)Growth Gallery(\s*)</g, `>$1${ent('6210 957f 76f8 518c')}$2<`],
  [/>(\s*)Account Settings(\s*)</g, `>$1${ent('8d26 53f7 8bbe 7f6e')}$2<`],
  [/>(\s*)Indoor(\s*)</g, `>$1${ent('5ba4 5185')}$2<`],
  [/>(\s*)Neutered(\s*)</g, `>$1${ent('5df2 7edd 80b2')}$2<`],
  [/>(\s*)Weight(\s*)</g, `>$1${ent('4f53 91cd')}$2<`],
  [/FVRCP Booster/g, ent('732b 4e09 8054 52a0 5f3a 9488')],
  [/Paw Cafe/g, ent('722a 722a 5496 5561')],
  [/Bean & Bone/g, ent('8c46 5b50 4e0e 9aa8 5934')],
  [/Corner Brew/g, ent('8857 89d2 5496 5561')],
  [/Generation failed/g, ent('751f 6210 5931 8d25')],
  [/Retry Generation/g, ent('91cd 65b0 751f 6210')],
  [/>(\s*)Cancel(\s*)</g, `>$1${ent('53d6 6d88')}$2<`],
  [/editBtn\.innerHTML\s*=\s*'Cancel';/g, `editBtn.innerHTML = '${ent('53d6 6d88')}';`],
  [/Failed to send/g, ent('53d1 9001 5931 8d25')],
  [/>(\s*)Resend(\s*)</g, `>$1${ent('91cd 65b0 53d1 9001')}$2<`],
  [/>(\s*)Delete(\s*)</g, `>$1${ent('5220 9664')}$2<`],
  [textRegex('999b 72d7'), ent('905b 72d7')],
  [textRegex('8d05 7ea7'), ent('8d85 7ea7')],
  [textRegex('5311 7310'), ent('53d1 73b0')],
  [textRegex('5730 5616'), ent('5730 56fe')],
  [textRegex('6284 6063'), ent('6d88 606f')],
  [/Mochi thinks Buddy looks very friendly! Want to go for a walk\?/g, `Mochi ${ent('89c9 5f97')} Buddy ${ent('5f88 53cb 597d ff0c 8981 4e0d 8981 4e00 8d77 53bb 905b 5f2f ff1f')}`],
  [/>(\s*)Happy(\s*)</g, `>$1${ent('5f00 5fc3')}$2<`],
  [/Happy &amp; Ready to talk/g, `${ent('5f00 5fc3 ff0c 968f 65f6 60f3 804a 5929')}`],
  [/Chat with Mochi - Lumii/g, `${ent('4e0e')} Mochi ${ent('5bf9 8bdd')} - Lumii`],
  [/Lumii - AI Companion Chat/g, `Lumii - AI ${ent('7535 5b50 5ba0 7269 5bf9 8bdd')}`],
  [/Max \(Lumii AI\)/g, `Max${ent('ff08 7075 4f34')} AI${ent('ff09')}`],
  [textRegex('5065 5eb7 542f 793a'), ent('5065 5eb7 63d0 793a')],
  [textRegex('4ece 5de6 5929 508d 665a 5f00 59cb 7684'), ent('4ece 6628 5929 508d 665a 5f00 59cb 7684')],
  [/What to eat\?/g, `${ent('4eca 5929 5403 4ec0 4e48 ff1f')}`],
  [/Health check/g, ent('5065 5eb7 68c0 67e5')],
  [/Tell me a story/g, ent('8bb2 4e2a 6545 4e8b')],
  [/Daily log/g, ent('65e5 5e38 8bb0 5f55')],
  [/Read 10:32 AM/g, `${ent('5df2 8bfb')} 10:32`],
  [/Today, 10:30 AM/g, `${ent('4eca 5929')} 10:30`],
  [/Lumii - Profile/g, `Lumii - ${ent('6211 7684')}`],
  [/Lumii - Nearby Pets/g, `Lumii - ${ent('9644 8fd1 5ba0 7269')}`],
  [/Lumii - Map Search/g, `Lumii - ${ent('5730 56fe 641c 7d22')}`],
  [/Pet-Friendly Map - Lumii/g, `${ent('5ba0 7269 53cb 597d 5730 56fe')} - Lumii`],
  [/Lumii - Say Hello/g, `Lumii - ${ent('6253 62db 547c')}`],
];

for (const file of stitchFiles) {
  const docPath = path.join('docs', 'stitch', file);
  if (!fs.existsSync(docPath)) continue;

  let html = fs.readFileSync(docPath, 'utf8');
  const before = html;
  for (const [regex, replacement] of replacements) {
    html = html.replace(regex, replacement);
  }

  if (html !== before) {
    fs.writeFileSync(docPath, html, 'utf8');
    fs.writeFileSync(path.join('mobile', 'public', 'stitch', file), html, 'utf8');
    console.log(`fixed ${file}`);
  }
}
