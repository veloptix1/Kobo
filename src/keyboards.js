import { InlineKeyboard } from 'grammy';

export function mainMenu() {
  return new InlineKeyboard()
    .text('💰 Mon solde', 'menu:balance').row()
    .text('🎯 Tâches', 'menu:tasks')
    .text('👥 Parrainage', 'menu:referral').row()
    .text('💸 Retrait', 'menu:withdraw')
    .text('🏆 Classement', 'menu:top').row()
    .text('ℹ️ Aide', 'menu:help');
}