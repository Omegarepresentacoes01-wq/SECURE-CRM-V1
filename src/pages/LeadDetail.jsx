import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import LeadInfo from "../components/leadDetail/LeadInfo";
import ActivityTimeline from "../components/leadDetail/ActivityTimeline";
import PreContractModal from "../components/leads/PreContractModal";

export default function LeadDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const leadId = urlParams.get("id");
  const queryClient = useQueryClient();
  const [showPreContrato, setShowPreContrato] = useState(false);

  const { data: lead, isLoading } = useQuery({
    queryKey: ["lead", leadId],
    queryFn: () => base44.entities.Lead.get(leadId),
    enabled: !!leadId,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["activities", leadId],
    queryFn: () => base44.entities.Activity.filter({ lead_id: leadId }, "-scheduled_date", 200),
    enabled: !!leadId,
  });

  const updateLead = useMutation({
    mutationFn: (data) => base44.entities.Lead.update(leadId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lead", leadId] }),
  });

  const createActivity = useMutation({
    mutationFn: (data) => base44.entities.Activity.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["activities", leadId] }),
  });

  const updateActivity = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Activity.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["activities", leadId] }),
  });

  if (isLoading || !lead) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to={createPageUrl("Leads")}>
          <Button variant="ghost" size="icon" className="h-9 w-9"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{lead.name}</h1>
          <p className="text-sm text-gray-500">{lead.company || lead.phone}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <LeadInfo
            lead={lead}
            onStatusChange={(status) => {
              updateLead.mutate({ status });
              if (status === "won") setShowPreContrato(true);
            }}
            onTempChange={(temperature) => updateLead.mutate({ temperature })}
          />
        </div>
        <div className="lg:col-span-2">
          <ActivityTimeline
            activities={activities}
            leadId={leadId}
            onCreate={(data) => createActivity.mutateAsync(data)}
            onToggle={(id, completed) => updateActivity.mutate({ id, data: { completed, completed_date: completed ? new Date().toISOString() : null } })}
          />
        </div>
      </div>
      {showPreContrato && lead && (
        <PreContractModal
          lead={lead}
          onClose={() => setShowPreContrato(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ["lead", leadId] })}
        />
      )}
    </div>
  );
}