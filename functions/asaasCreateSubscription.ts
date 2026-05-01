import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'super_admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { organization_id, plan, billing_cycle = 'MONTHLY' } = await req.json();

    // Busca a organização
    const org = await base44.asServiceRole.entities.Organization.get(organization_id);
    if (!org) {
      return Response.json({ error: 'Organização não encontrada' }, { status: 404 });
    }

    // Valores dos planos
    const planPrices = {
      basic: 97,
      professional: 197,
      enterprise: 497
    };

    const value = planPrices[plan] || planPrices.basic;

    // Cria ou busca cliente no Asaas
    const asaasApiKey = Deno.env.get('ASAAS_API_KEY');
    // Usa sandbox se a chave for de homologação
    const asaasUrl = asaasApiKey.includes('hmlg') 
      ? 'https://sandbox.asaas.com/api/v3'
      : 'https://api.asaas.com/v3';

    // Busca cliente existente por email
    let customerId;
    const searchResponse = await fetch(`${asaasUrl}/customers?email=${encodeURIComponent(org.owner_email)}`, {
      headers: {
        'access_token': asaasApiKey,
        'Content-Type': 'application/json'
      }
    });

    const searchData = await searchResponse.json();
    console.log('Busca cliente Asaas:', searchData);
    
    if (searchData.data && searchData.data.length > 0) {
      customerId = searchData.data[0].id;
      console.log('Cliente existente encontrado:', customerId);
    } else {
      // Prepara dados do cliente
      const customerPayload = {
        name: org.owner_name || org.name,
        email: org.owner_email,
        notificationDisabled: false
      };

      // Adiciona CNPJ apenas se existir e for válido
      if (org.cnpj && org.cnpj.length >= 11) {
        customerPayload.cpfCnpj = org.cnpj.replace(/\D/g, '');
      }

      // Adiciona telefone apenas se existir
      if (org.phone) {
        customerPayload.phone = org.phone.replace(/\D/g, '');
      }

      console.log('Criando cliente Asaas:', customerPayload);

      // Cria novo cliente
      const customerResponse = await fetch(`${asaasUrl}/customers`, {
        method: 'POST',
        headers: {
          'access_token': asaasApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(customerPayload)
      });

      const customerData = await customerResponse.json();
      console.log('Resposta criar cliente:', customerData);

      if (customerData.errors) {
        return Response.json({ 
          error: 'Erro ao criar cliente: ' + customerData.errors[0].description 
        }, { status: 400 });
      }

      customerId = customerData.id;
    }

    // Cria assinatura no Asaas
    const subscriptionPayload = {
      customer: customerId,
      billingType: 'BOLETO',
      cycle: billing_cycle,
      value: value,
      nextDueDate: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split('T')[0],
      description: `Assinatura ${plan.toUpperCase()} - SecureCRM`,
      externalReference: organization_id
    };

    console.log('Criando assinatura Asaas:', subscriptionPayload);

    const subscriptionResponse = await fetch(`${asaasUrl}/subscriptions`, {
      method: 'POST',
      headers: {
        'access_token': asaasApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(subscriptionPayload)
    });

    const subscriptionData = await subscriptionResponse.json();
    console.log('Resposta criar assinatura:', subscriptionData);

    if (subscriptionData.errors) {
      return Response.json({ 
        error: 'Erro ao criar assinatura: ' + subscriptionData.errors[0].description 
      }, { status: 400 });
    }

    // Atualiza a organização com dados do Asaas
    await base44.asServiceRole.entities.Organization.update(organization_id, {
      asaas_customer_id: customerId,
      asaas_subscription_id: subscriptionData.id
    });

    return Response.json({
      success: true,
      subscription: subscriptionData,
      customerId: customerId
    });

  } catch (error) {
    console.error('Erro ao criar assinatura Asaas:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});