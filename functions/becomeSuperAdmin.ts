import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verifica se o usuário está autenticado
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Verifica se já existem organizações
    const organizations = await base44.asServiceRole.entities.Organization.list();
    
    if (organizations.length > 0) {
      return Response.json(
        { error: 'Já existem organizações no sistema. Apenas o primeiro usuário pode se tornar super admin.' },
        { status: 403 }
      );
    }

    // Se não há organizações, promove o usuário a super_admin
    await base44.asServiceRole.entities.User.update(user.id, { role: 'super_admin' });

    return Response.json({ success: true, message: 'Promovido a super admin com sucesso' });
  } catch (error) {
    console.error('Erro ao promover super admin:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});