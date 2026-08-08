import React from "react";
import { CTVUser, ReferralLead, PayoutRequest, Appointment, AppointmentInvoice, ServiceItem, ServiceFeedback } from "../types";
import { AuthUserProfile } from "../lib/supabase";
import { AdminDashboard } from "./AdminDashboard";

interface AccountantDashboardProps {
  ctvUser: CTVUser;
  leads: ReferralLead[];
  appointments?: Appointment[];
  services?: ServiceItem[];
  feedbacks?: ServiceFeedback[];
  invoices?: AppointmentInvoice[];
  payoutRequests: PayoutRequest[];
  authUser?: AuthUserProfile;
  onApprovePayoutRequest?: (requestId: string) => void;
  onRejectPayoutRequest?: (requestId: string) => void;
  onUpdatePayoutRequest?: (updatedReq: PayoutRequest) => void;
  onUpdateInvoice?: (updatedInvoice: AppointmentInvoice) => void;
  onUpdateAppointmentStatus?: (appointmentId: string, status: Appointment["status"]) => void;
  onCreditCTVCommission?: (ctvCode: string, commissionAmount: number, serviceName: string) => void;
  onRoleChange?: (role: any) => void;
  onSignOut?: () => void;
}

export const AccountantDashboard: React.FC<AccountantDashboardProps> = ({
  ctvUser,
  leads,
  appointments = [],
  services = [],
  feedbacks = [],
  invoices = [],
  payoutRequests = [],
  authUser,
  onApprovePayoutRequest,
  onRejectPayoutRequest,
  onUpdatePayoutRequest,
  onUpdateInvoice,
  onUpdateAppointmentStatus,
  onCreditCTVCommission,
  onRoleChange,
  onSignOut
}) => {
  return (
    <AdminDashboard
      userRole="accountant"
      ctvUser={ctvUser}
      leads={leads}
      appointments={appointments}
      services={services}
      feedbacks={feedbacks}
      invoices={invoices}
      payoutRequests={payoutRequests}
      authUser={authUser}
      onApproveLead={() => {}}
      onUpdateStatus={onUpdateAppointmentStatus}
      onUpdatePayoutRequest={onUpdatePayoutRequest}
      onUpdateInvoice={onUpdateInvoice}
      onCreditCTVCommission={onCreditCTVCommission}
      onRoleChange={onRoleChange}
      onSignOut={onSignOut}
    />
  );
};
