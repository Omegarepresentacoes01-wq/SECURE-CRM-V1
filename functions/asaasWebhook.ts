import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    // Valida token do webhook
    const token = new URL(req.url).searchParams.get('token');
    const expectedToken = Deno.env.get('ASAAS_WEBHOOK_TOKEN');
    
    if (token !== expectedToken) {
      return Response.json({ error: 'Token inválido' }, { status: 401 });
    }

    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    console.log('Webhook Asaas recebido:', payload);

    const { event, payment, subscription } = payload;

    if (!payment || !payment.externalReference) {
      return Response.json({ received: true });
    }

    const organization_id = payment.externalReference;

    // Atualiza status baseado no evento
    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
      // Pagamento confirmado - ativa a organização
      await base44.asServiceRole.entities.Organization.update(organization_id, {
        status: 'active',
        subscription_starts_at: new Date().toISOString().split('T')[0],
        subscription_ends_at: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0]
      });

      // Registra o pagamento no billing
      await base44.asServiceRole.entities.Billing.create({
        organization_id: organization_id,
        type: 'subscription',
        status: 'paid',
        amount: payment.value,
        final_amount: payment.value,
        billing_date: new Date().toISOString().split('T')[0],
        payment_method: payment.billingType,
        notes: `Pagamento confirmado - Asaas ID: ${payment.id}`
      });

    } else if (event === 'PAYMENT_OVERDUE') {
      // Pagamento atrasado - suspende a organização
      await base44.asServiceRole.entities.Organization.update(organization_id, {
        status: 'suspended'
      });

      await base44.asServiceRole.entities.Billing.create({
        organization_id: organization_id,
        type: 'subscription',
        status: 'pending',
        amount: payment.value,
        final_amount: payment.value,
        billing_date: new Date().toISOString().split('T')[0],
        payment_method: payment.billingType,
        notes: `Pagamento em atraso - Asaas ID: ${payment.id}`
      });

    } else if (event === 'PAYMENT_DELETED' || event === 'PAYMENT_REFUNDED') {
      // Pagamento cancelado/reembolsado
      await base44.asServiceRole.entities.Billing.create({
        organization_id: organization_id,
        type: 'subscription',
        status: 'refunded',
        amount: payment.value,
        final_amount: payment.value,
        billing_date: new Date().toISOString().split('T')[0],
        payment_method: payment.billingType,
        notes: `Pagamento ${event === 'PAYMENT_REFUNDED' ? 'reembolsado' : 'cancelado'} - Asaas ID: ${payment.id}`
      });
    }

    return Response.json({ received: true });

  } catch (error) {
    console.error('Erro no webhook Asaas:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});