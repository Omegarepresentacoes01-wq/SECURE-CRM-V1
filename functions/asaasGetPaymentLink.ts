import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'super_admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { organization_id } = await req.json();

    const org = await base44.asServiceRole.entities.Organization.get(organization_id);
    
    if (!org || !org.asaas_subscription_id) {
      return Response.json({ error: 'Assinatura não encontrada' }, { status: 404 });
    }

    const asaasApiKey = Deno.env.get('ASAAS_API_KEY');
    // Usa sandbox se a chave for de homologação
    const asaasUrl = asaasApiKey.includes('hmlg') 
      ? 'https://sandbox.asaas.com/api/v3'
      : 'https://api.asaas.com/v3';

    // Busca dados da assinatura
    const subscriptionResponse = await fetch(
      `${asaasUrl}/subscriptions/${org.asaas_subscription_id}`,
      {
        headers: {
          'access_token': asaasApiKey
        }
      }
    );

    const subscriptionData = await subscriptionResponse.json();

    // Busca pagamentos da assinatura
    const paymentsResponse = await fetch(
      `${asaasUrl}/payments?subscription=${org.asaas_subscription_id}&limit=1`,
      {
        headers: {
          'access_token': asaasApiKey
        }
      }
    );

    const paymentsData = await paymentsResponse.json();
    const lastPayment = paymentsData.data?.[0];

    return Response.json({
      success: true,
      subscription: subscriptionData,
      payment: lastPayment,
      invoiceUrl: lastPayment?.invoiceUrl,
      bankSlipUrl: lastPayment?.bankSlipUrl
    });

  } catch (error) {
    console.error('Erro ao buscar link de pagamento:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});