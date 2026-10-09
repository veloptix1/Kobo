import { InlineKeyboard, Keyboard } from 'grammy';

// === Clavier persistant en bas (Reply Keyboard) ===
export function persistentMenu() {
  return new Keyboard()
    .text('💰 Solde').text('🎯 Tâches').row()
    .text('👥 Parrainage').text('💸 Retrait').row()
    .text('🏆 Classement').text('ℹ️ Aide')
    .resized()      // taille adaptée au contenu
    .persistent();  // reste toujours visible
}

// === Clavier inline (dans les messages) ===
export function mainMenu() {
  return new InlineKeyboard()
    .text('💰 Mon solde', 'menu:balance').row()
    .text('🎯 Tâches', 'menu:tasks')
    .text('👥 Parrainage', 'menu:referral').row()
    .text('💸 Retrait', 'menu:withdraw')
    .text('🏆 Classement', 'menu:top').row()
    .text('ℹ️ Aide', 'menu:help');
}