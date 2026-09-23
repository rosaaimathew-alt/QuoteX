// Placeholder legal content — DRAFT copy so every required document has a home in
// the app today. Every doc is clearly marked as a placeholder pending attorney
// review; swap the real language in per section when the contracts are finalized.
// companyName is threaded in so these read correctly per brand.

export const PLACEHOLDER_NOTE =
  'DRAFT — placeholder text, pending attorney review. Not yet legally binding. Replace with final language before relying on it.'

const P = (companyName) => companyName || 'the Company'

export const LEGAL_DOCS = {
  terms: {
    title: 'Terms of Service',
    subtitle: 'Master Subscription Agreement',
    build: (c) => [
      { h: '1. Agreement', p: [`These Terms govern use of the ${P(c)} software platform ("the Service") by the business that subscribes ("Customer"). By using the Service, Customer agrees to these Terms.`] },
      { h: '2. The Service', p: ['The Service provides estimating, proposal, contract, e-signature, and job-management tools. Features may change over time.'] },
      { h: '3. Accounts & access', p: ['Customer is responsible for its users, credentials, and the accuracy of data it enters. Customer must keep login credentials secure.'] },
      { h: '4. Customer data', p: ['Customer owns the data it enters. The Service processes that data on Customer’s behalf as described in the Data Processing Agreement.'] },
      { h: '5. Acceptable use', p: ['Use is subject to the Acceptable Use Policy. Prohibited use may result in suspension.'] },
      { h: '6. Fees', p: ['Fees, billing, and refunds (if any) are described in the Subscription & Billing Terms.'] },
      { h: '7. Disclaimers & liability', p: ['[PLACEHOLDER] Warranty disclaimers and limitation-of-liability language to be provided by counsel.'] },
      { h: '8. Term & termination', p: ['[PLACEHOLDER] Term, termination, and data-return/deletion terms to be provided by counsel.'] },
      { h: '9. Contact', p: [`Questions about these Terms: contact ${P(c)}.`] },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    subtitle: 'How we collect, use, and store information',
    build: (c) => [
      { h: '1. Scope', p: [`This policy explains how ${P(c)} handles personal information collected through the Service, including a business’s own users and its end customers (e.g., homeowners).`] },
      { h: '2. What we collect', p: ['Contact details (name, email, phone, address), proposal and contract content, e-signatures and their audit trail (timestamp, IP, device), and usage/engagement data such as when a proposal link is opened.'] },
      { h: '3. Cookies, tracking & local storage', p: ['The Service uses browser local storage to keep the app working, and records when shared proposal links are opened (open-tracking). These are used to operate the Service and report engagement to the business that sent the proposal.'] },
      { h: '4. How we use information', p: ['To provide the Service: build and send proposals, execute contracts, track engagement, and support the business’s operations.'] },
      { h: '5. Sharing', p: ['[PLACEHOLDER] We do not sell personal information. Sub-processor and sharing details to be finalized with counsel.'] },
      { h: '6. Your rights', p: ['[PLACEHOLDER] Access, correction, deletion, and opt-out rights (including state-specific rights such as California) to be finalized with counsel.'] },
      { h: '7. Retention & security', p: ['[PLACEHOLDER] Retention periods and security measures to be finalized with counsel.'] },
      { h: '8. Contact', p: [`Privacy questions: contact ${P(c)}.`] },
    ],
  },
  dpa: {
    title: 'Data Processing Agreement',
    subtitle: 'Processing of end-customer data on behalf of the business',
    build: (c) => [
      { h: '1. Roles', p: [`The subscribing business is the data controller. ${P(c)} is the processor, handling end-customer personal data only to provide the Service on the business’s instructions.`] },
      { h: '2. Scope of processing', p: ['Personal data processed: contact details, proposal/contract content, e-signatures, and engagement data. Purpose: operating the Service.'] },
      { h: '3. Confidentiality & security', p: ['[PLACEHOLDER] Confidentiality obligations and technical/organizational security measures to be finalized with counsel.'] },
      { h: '4. Sub-processors', p: ['[PLACEHOLDER] List and terms for sub-processors (hosting, database, email) to be finalized with counsel.'] },
      { h: '5. Data-subject requests & breach', p: ['[PLACEHOLDER] Assistance with data-subject requests and breach-notification obligations to be finalized with counsel.'] },
      { h: '6. Return & deletion', p: ['[PLACEHOLDER] Return and deletion of data on termination to be finalized with counsel.'] },
    ],
  },
  aup: {
    title: 'Acceptable Use Policy',
    subtitle: 'What is and isn’t allowed on the platform',
    build: (c) => [
      { h: '1. Purpose', p: [`This policy sets the rules for acceptable use of the ${P(c)} Service.`] },
      { h: '2. Prohibited use', p: ['No unlawful use; no uploading of others’ confidential data without authority; no attempts to breach security, access other accounts, or disrupt the Service; no sending of unlawful or unconsented communications.'] },
      { h: '3. Communications & consent', p: ['Customers must obtain any legally required consent (e.g., TCPA for texts/calls) before contacting their end customers through or as a result of the Service.'] },
      { h: '4. Enforcement', p: ['[PLACEHOLDER] Suspension and enforcement terms to be finalized with counsel.'] },
    ],
  },
  refund: {
    title: 'Subscription & Billing Terms',
    subtitle: 'Fees, billing, and refunds',
    build: () => [
      { h: '1. Fees', p: ['[PLACEHOLDER] Subscription tiers and pricing to be defined once billing is enabled.'] },
      { h: '2. Billing', p: ['[PLACEHOLDER] Billing cycle, payment method, and renewal terms to be defined.'] },
      { h: '3. Refunds', p: ['[PLACEHOLDER] Refund and cancellation policy to be defined.'] },
      { h: '4. Changes', p: ['[PLACEHOLDER] How and when pricing may change, with notice, to be defined.'] },
    ],
  },
}

// Binding-agreement acknowledgment shown at signing, separate from e-sign consent.
export const AGREEMENT_ACK =
  'I have read and agree to the terms of this contract, and I understand that signing it forms a legally binding agreement.'

// Shown on the signing page before a signature is captured (ESIGN/UETA).
export const ESIGN_DISCLOSURE = {
  title: 'Consent to do business electronically',
  note: PLACEHOLDER_NOTE,
  body: [
    'By checking the box below, you agree to sign this document electronically and that your electronic signature is legally binding, the same as a handwritten one, under the U.S. ESIGN Act and applicable state UETA law.',
    'You confirm you can access and read this document on your device, and you may request a paper copy or withdraw consent before signing by contacting the sender.',
    '[PLACEHOLDER] Final ESIGN/UETA disclosure language to be confirmed by counsel.',
  ],
}

export const LEGAL_ORDER = ['terms', 'privacy', 'dpa', 'aup', 'refund']
