export type ReportType = 'lost' | 'found';

export type ItemStatus = 'lost' | 'found' | 'match_found' | 'claim_pending' | 'claimed' | 'verified' | 'returned' | 'recovered';

export type ItemCategory = 
  | 'Electronics'
  | 'ID & Academic Cards'
  | 'Keys'
  | 'Wallets & Purses'
  | 'Bags & Backpacks'
  | 'Books & Notes'
  | 'Wearables & Watches'
  | 'Eyewear & Sunglasses'
  | 'Calculators & Stationary'
  | 'Water Bottles'
  | 'Clothing & Jackets'
  | 'Sports Equipment'
  | 'Other Items';

export type ItemColor = 
  | 'Black'
  | 'White'
  | 'Blue'
  | 'Red'
  | 'Silver / Grey'
  | 'Gold'
  | 'Green'
  | 'Yellow'
  | 'Brown'
  | 'Pink'
  | 'Purple'
  | 'Multi-color';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  uidOrRoll: string; // CU UID e.g. 21BCS10482
  phone: string;
  department: string;
  role: 'student' | 'admin';
  avatarUrl?: string;
  joinedDate: string;
  profileCompleted?: boolean;
  hidePhone?: boolean; // Privacy setting: hide contact mobile number across listings
  authProvider?: 'google' | 'password';
}

export interface ItemReport {
  id: string;
  type: ReportType; // 'lost' | 'found'
  title: string;
  category: ItemCategory;
  color: ItemColor;
  brandOrModel?: string;
  description: string;
  locationBlock: string; // e.g., "Academic Block 1 (A1 - Computer Science)"
  specificSpot: string; // e.g., "2nd Floor Lab 204 near window"
  dateTime: string; // ISO date string
  imageUrl: string;
  status: ItemStatus;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  userUid?: string;
  hidePhone?: boolean; // Feature: Hide mobile number from public view (use in-app chat)
  // For found items:
  currentHoldingLocation?: string; // e.g. "Security Gate 1 Helpdesk" or "With Finder in B3-304"
  identifyingMark?: string; // e.g. "Sticker of Pikachu on back"
  secretVerificationQuestion?: string; // Question owner must answer
  createdAt: string;
  updatedAt: string;
}

export interface MatchFactor {
  label: string;
  matched: boolean;
  weight: number;
  detail: string;
}

export interface MatchSuggestion {
  targetItem: ItemReport;
  candidateItem: ItemReport;
  matchScore: number; // 0 to 100
  factors: MatchFactor[];
  reasons: string[];
}

export interface ItemClaim {
  id: string;
  itemId: string;
  itemTitle: string;
  itemType: ReportType;
  claimantId: string;
  claimantName: string;
  claimantEmail: string;
  claimantPhone: string;
  claimantUid: string;
  // Verification answers
  proofDescription: string;
  serialNumberOrIdentifier?: string;
  secretAnswer?: string;
  proofImageUrl?: string;
  additionalNotes?: string;
  status: 'pending' | 'verified' | 'rejected' | 'returned';
  adminNotes?: string;
  pickupLocation?: string;
  createdAt: string;
  verifiedAt?: string;
  returnedAt?: string;
}

export interface HandoverReceipt {
  receiptNumber: string;
  itemId: string;
  itemTitle: string;
  claimId: string;
  claimantName: string;
  claimantUid: string;
  claimantEmail: string;
  claimantPhone: string;
  finderName?: string;
  handoverOfficer: string;
  handoverLocation: string;
  timestamp: string;
}

export interface ItemMessage {
  id: string;
  itemId: string;
  itemTitle: string;
  itemType: ReportType;
  senderId: string;
  senderName: string;
  senderEmail: string;
  senderPhone: string;
  senderUid: string;
  senderRole?: 'student' | 'admin';
  recipientId?: string;
  recipientEmail?: string;
  recipientName?: string;
  messageText: string;
  currentFoundLocation?: string;
  proofImageUrl?: string;
  status: 'unread' | 'read' | 'resolved';
  createdAt: string;
  threadId?: string;
  replyToId?: string;
  hideSenderPhone?: boolean;
}

