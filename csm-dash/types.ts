//form hook
/**
 * @name: Inputs
 * @description - Form Inputs for useForm() hook.
 */
export type Inputs = {
  value:
    | string
    | number
    | boolean
    | string[]
    | Record<string, any>[]
    | undefined;
  isValid: boolean;
};

/**
 * @name: State
 * @description - State of form hook.
 */
export type State = {
  inputs: Record<string, Inputs>;
  isValid: boolean;
};

/**
 * @name: InputChangeAction
 * @description - input changes in useForm hook.
 */
export type InputChangeAction = {
  type: "INPUT_CHANGE";
  value: string | number | boolean | string[];
  isValid: boolean;
  inputId: string;
};

/**
 * @name: SetFormAction
 * @description - set form to confirm if all fields ar evalid
 */
export type SetFormAction = {
  type: "SET_DATA";
  inputs: Record<string, Inputs>;
  formIsValid: boolean;
};

/**
 * @name: Action
 * @description - Action types for useForm hook
 */
export type Action = InputChangeAction | SetFormAction;
//endof formhook types

/**
 * @name: IncomeReport
 * @description - Type for addIncome() hook object
 */
export type IncomeReport = {
  totalAmount: number;
  dateOfTransaction?: Date;
  category: string;
  cogs: number;
  grossProfit?: number;
  taxAmount?: number;
  processingFees: number;
  netProfit?: number;
  comment?: string;
};

/**
 * @name: ExpenseReport
 * @description - Type for addExpnse() hook object
 */
export type ExpenseReport = {
  initialAmount: number;
  amountOwed?: number;
  lastUpdateDate?: Date;
  totalDeduction?: number;
  startDate?: Date;
  category: string;
  taxAmount?: number;
  comment: string;
};


interface IParticipantInfo {
  id: string;
  name: string;
  image: string;
  role: 'user' | 'barber' | 'admin';
}

export interface IChat {
  _id?: string,
  participants: string[]; // 2 user ids
  participantInfo: IParticipantInfo[]; // 2 objects
  lastMessage?: string;
  lastMessageTime?: Date;
  bookingId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  chatIsComplete?: boolean;

}

export interface IMessage {
  _id?: string,
  chatId: string,
  senderId: string,
  text: string,
  read: boolean,
  createdAt?: Date,
  updatedAt?: Date,
};

export interface IDisputes {
  userId: string;
  barberId: string;
  bookingId: string;
  transactionId: string;
  disputeExplanation: string;
  disputeDate: Date;
  initiator: 'user' | 'barber';
  initiatorName: string;
  amountPaid: number;
  stripePaymentIntentId: string;
  barberName: string;
  barberResponse: string;
  imageOne: string;
  imageTwo: string;
  category: 'no_show' | 'service_not_provided' | 'unsafe_environment' | 'client_behavoir' | 'barber_behavoir' | 'incorrect_charge_amount';
  disputeStatus: 'awaiting_barber_response' |'in_review' | 'awaiting_user_response' | 'closed';
  decision: 'in_favor_barber' | 'in_favor_user' | 'settled';
  action: 'none' | 'refund' | 'partial_refund' | 'pending';
  platformResponse: string,
  desiredAction?: 'full_refund' | 'partial_refund' | 'strike_account',
  requestedRefundAmount?: number;
};

export type TService = { name: string, description: string, price: number }

export interface IBarberServices {
    barberId: string;
    services: TService[];
}

export interface IBookings {
  bookingNumber: string;
  customerId: string; // ref: Barbers
  customerName: string;
  customerImg: string;
  barberImg: string;
  barberName: string;
  barberId: string; // ref: Barbers
  bookingDate: string;
  bookingTime: string;
  bookingLocation: string;
  bookingDateAndTime: Date;
  bookingEndDateAndTime: Date;
  isConfirmed: boolean;
  addOns: TService[];
  price: number;
  discount?: number;
  discountId?: string;
  couponAdded?: string;
  tip?: number;
  platformFee: number;
  barberIsStarted: boolean;
  barberStartTime: string;
  barberIsComplete: boolean;
  barberCompleteTime: string;
  proofOfCompletionImg?: string;
  customerConfirmComplete: boolean;
  bookingStatus: 'pending' | 'confirmed' | 'completed' | 'canceled' | 'reschedule' | 'expired';
  hasReview?: boolean;
  reviewId: string;
  paymentType: 'onCompletion' | 'halfNow' | 'payInFull';
  cancelFee?: number;
  cancelFeeType?: 'percent' | 'number';
  serviceFee?: number;
  initialPaymentIntentId?: string;
  remainingAmount?: number;
  isAppLevelCoupon?: boolean;
  chatId?: string;
  rescheduleRequest?: {
      requestedDay: string,
      startTime: string;
      endTime: string; 
  };
  transactionId?: string;
  transactionId2?: string;
  lateWarningIssuedBy?: "barber" | "user" | null;
  lateWarningIssuedAt?: Date | null;
  lateWarningExpiresAt?: Date | null;
  lateWarningResponse?: "onMyWay" | "noResponse" | null
  clientNoShow?: boolean;
  barberNoShow?: boolean;
};

export type Services = {
  serviceType: string;
  price: number;
  description: string;
};

export type Status = 'Available' | "Busy" | "Away";
export type LicenseInfo = {
name: string;
city: string;
state: string;
zip: number;
expiration: string | Date;
category: string;
registrationNumber: number;
}

export type UserLocationData = {
primaryLocation: string;
state: string;
city: string;
zip: string;
}


export interface IBarber  {
  _id?: string;
  name: string;
  email: string;
  bio?: string;
  password?: string;
  pushToken?: string;
  isVerified?: boolean;
  userLicense?: LicenseInfo;
  myBookings?: string[];
  userHasActiveBooking?: boolean;
  image?: string;
  imageOne?: string;
  imageTwo?: string;
  imageThree?: string;
  imageFour?: string;
  imageFive?: string;
  imageSix?: string;
  appleId?: string;
  geoLocation?: {
      type: 'Point';
      coordinates: [number, number]; // [longitude, latitude]
    };
  location?: string;
  isVisible?: boolean;
  userIsLive?: boolean;
  shopName?: string;
  services?: string[]
  isAvailable?: boolean;
  status?: Status;
  startingPrice?: number;
  houseCallPrice?: number;
  hours?: string[];
  avgReviewScore?: number;
  totalReviews?: number;
  reviews?: string[];
  transactions?: string[];
  requestedBooking?: number;
  customerBookings?: string[];
  hasActiveDeal?: boolean;
  accountType?: 'user' | 'barber',
  accountStatus: 'good' | 'suspended' |'banned';
  shops?: string[];
  coupons?: string[];
  myCoupons?: string[];
  primaryLocation?: string;
  otherLocations?: string[];
  stripeCustomerId: string;
  stripeAccountId: string;
  stripeDefaultPaymentMethodId?: string;
  cancelFee?: number;
  cancelFeeType?: 'percent' | 'number';
  cancelPolicy?: string;
  paymentPolicy?: 'halfNow' | 'payInFull' | 'onCompletion';
  rewardPoints?: number;
  myFavorites?: string[];
  hasAppLevelCoupon?: boolean;
  appLevelCouponCodes: string[];
  clientLocation?: UserLocationData;
  accountStrikes?: number;
  barberDebt?: number;
  tokenVersion?: number;
};