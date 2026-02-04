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
 * @name UserProps
 * @description - properties for login and signup
 */
export type UserProps = {
  userName?: string;
  email: string;
  password: string;
};

/**
 * @name UserObject
 * @Description - properties of a user who has signed up
 */

export type UserObject = {
  id: string;
  name?: string;
  userName?: string;
  email: string;
  role?: "user" | "admin";
  authProvider?: "local" | "firebase" | "google";
  reviews?: number[];
  cred?: number;
};

// =========================
// Backend model types (client-friendly)
// - ObjectIds -> string
// - Dates -> string | Date
// =========================

export type TShippingAddress = {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
};

export type UserRole = "user" | "admin";
export type AuthProvider = "local" | "firebase" | "google";

export type User = {
  _id?: string;
  name: string;
  email: string;
  password?: string | null;
  role: UserRole;
  authProvider: AuthProvider;
  firebaseUid?: string | null;
  googleSub?: string | null;
  rewardPoints: number;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate?: string | Date | null;
  lastLoginDate?: string | Date | null;
  defaultShippingAddress?: TShippingAddress | null;
  defaultPaymentMethod?: string | null;
  paymentMethods?: string[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export type Product = {
  _id?: string;
  name: string;
  description: string;
  price: number;
  previousPrice?: number;
  image: string[];
  category: string;
  subCategory: string;
  brand: string;
  stock: number;
  isActive: boolean;
  totalReviews: number;
  averageRating: number;
  sku?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export type OrderDiscountType = "percentage" | "fixed";

export type Order = {
  _id?: string;
  userId: string;
  productId: string;
  quantity: number;
  price: number;
  totalPrice: number;
  discount?: number;
  discountType?: OrderDiscountType;
  discountCode?: string;
  orderDate: string | Date;
  trackingNumber: string;
  shippingAddress: TShippingAddress;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export type Review = {
  _id?: string;
  productId: string;
  userId: string;
  orderId: string;
  rating: number;
  datePosted: string | Date;
  purchaseDate: string | Date;
  title?: string;
  comment?: string;
  reviewImages?: string[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export type PromoType = "percentage" | "fixed";

export type Promo = {
  _id?: string;
  promoCode: string;
  promoType: PromoType;
  promoValue: number;
  promoStartDate: string | Date;
  promoEndDate: string | Date;
  promoUsageLimit: number;
  promoUsageCount: number;
  totalSales: number;
};

export type IssueType =
  | "product_defect"
  | "wrong_product"
  | "wrong_quantity"
  | "other"
  | "not_received";

export type IssueStatus = "pending" | "resolved" | "closed";

export type Issue = {
  _id?: string;
  userId: string;
  productId: string;
  orderId: string;
  issueType: IssueType;
  issueDescription: string;
  issueDate: string | Date;
  issueStatus?: IssueStatus;
  issueResolution?: string;
  issueResolutionDate?: string | Date;
  issueResolutionImages?: string[];
};
