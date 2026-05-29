import type { IDisputes } from "../models/disputes";

export type DisputeCategory = IDisputes["category"];
export type DisputeInitiator = IDisputes["initiator"];

export function initialDisputeStatus(
  category: DisputeCategory,
  initiator: DisputeInitiator,
): IDisputes["disputeStatus"] {
  switch (category) {
    case "incorrect_charge_amount":
      return "in_review";
    case "service_not_provided":
    case "seller_behavoir":
      return "awaiting_seller_response";
    case "unsafe_environment":
      return initiator === "user"
        ? "awaiting_seller_response"
        : "awaiting_user_response";
    case "client_behavoir":
      return "awaiting_user_response";
    case "no_show":
      return "awaiting_seller_response";
    default:
      return "in_review";
  }
}
