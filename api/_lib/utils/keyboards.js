import { InlineKeyboard, Keyboard } from 'grammy';

// === Clavier persistant en bas (Reply Keyboard) ===
export function persistentMenu() {
  return new Keyboard()
    .text('💰 Solde').text('🎯 Tâches').row()
    .text('👥 Parrainage').text('💸 Retrait').row()
    .text('🔄 Convertir').text('🏆 Classement').row()
    .text('ℹ️ Info')
    .resized()
    .persistent();
}

// === Clavier inline (utilisé dans les messages) ===
export function mainMenu() {
  return new InlineKeyboard()
    .text('💰 Mon solde', 'menu:balance').row()
    .text('🎯 Tâches', 'menu:tasks')
    .text('👥 Parrainage', 'menu:referral').row()
    .text('💸 Retrait', 'menu:withdraw')
    .text('🔄 Convertir', 'menu:convert').row()
    .text('🏆 Classement', 'menu:top')
    .text('ℹ️ Info', 'menu:info');
}