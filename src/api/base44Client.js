/**
 * Antes usava o SDK Base44. Agora re-exporta nossa API Rails própria,
 * mantendo a mesma interface para que as páginas não precisem mudar.
 */
import auth from './auth';
import { Lead, Activity, Contract, Financial, PostSale, Organization, User, Billing, Coupon } from './entities';

export const base44 = {
  auth,
  entities: {
    Lead,
    Activity,
    Contract,
    Financial,
    PostSale,
    Organization,
    User,
    Billing,
    Coupon,
  },
  // Stub para compatibilidade com NavigationTracker (era funcionalidade do SDK Base44)
  appLogs: {
    logUserInApp: () => Promise.resolve(),
  },
  functions: {
    // becomeSuperAdmin: promove o usuário atual a super_admin via API Rails
    invoke: async (name, _params) => {
      if (name === 'becomeSuperAdmin') {
        await auth.updateMe({ role: 'super_admin' });
        return { data: {} }; // sem erro → o OnboardingWizard recarrega a página
      }
      return { data: {} };
    },
  },
};
