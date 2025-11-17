import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Shield } from "lucide-react";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="Privacy Policy | Lana Tutors"
        description="Lana Tutors Privacy Policy - Learn how we collect, use, and protect your personal information in compliance with Kenyan Data Protection Act."
        canonical="/privacy-policy"
      />

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="w-10 h-10 text-primary" />
          <div>
            <h1 className="text-4xl font-bold">Privacy Policy</h1>
            <p className="text-muted-foreground">Last updated: November 17, 2025</p>
          </div>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              At Lana Tutors, we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your data in compliance with the Kenya Data Protection Act, 2019.
            </p>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>1. Information We Collect</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">1.1 Personal Information</h3>
                <p className="text-muted-foreground mb-2">We collect the following types of personal information:</p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li><strong>For Students:</strong> Full name, email address, phone number, age, grade level, curriculum, subjects of interest, learning goals, and parent/guardian contact information</li>
                  <li><strong>For Tutors:</strong> Full name, email address, phone number, educational qualifications, teaching experience, current institution, TSC number (where applicable), CV, profile photo, and bank account details for payments</li>
                  <li><strong>For All Users:</strong> Account credentials, profile pictures, and communication preferences</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">1.2 Automatically Collected Information</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li>IP address and device information</li>
                  <li>Browser type and version</li>
                  <li>Usage data and session information</li>
                  <li>Cookies and similar tracking technologies</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">1.3 Third-Party Information</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li>Google account information (if you sign in with Google)</li>
                  <li>Google Calendar access (for tutors who enable calendar integration)</li>
                  <li>Payment information processed through Pesapal</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. How We Use Your Information</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-2">We use your personal information for the following purposes:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>To create and manage your account</li>
                <li>To facilitate tutoring sessions and bookings</li>
                <li>To process payments and maintain financial records</li>
                <li>To communicate with you about your bookings, sessions, and account</li>
                <li>To verify tutor credentials and maintain platform quality</li>
                <li>To generate Google Meet links and calendar events for sessions</li>
                <li>To track student progress and provide personalized learning experiences</li>
                <li>To send service updates, promotional materials, and educational content (with your consent)</li>
                <li>To improve our services and develop new features</li>
                <li>To ensure platform security and prevent fraud</li>
                <li>To comply with legal obligations and resolve disputes</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. Legal Basis for Processing</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-2">Under the Kenya Data Protection Act, we process your personal data based on:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li><strong>Consent:</strong> You have given clear consent for us to process your personal data for specific purposes</li>
                <li><strong>Contract:</strong> Processing is necessary for a contract we have with you (tutoring services)</li>
                <li><strong>Legal Obligation:</strong> Processing is necessary to comply with the law</li>
                <li><strong>Legitimate Interests:</strong> Processing is necessary for our legitimate interests or those of a third party</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>4. Data Sharing and Disclosure</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">4.1 Service Providers</h3>
                <p className="text-muted-foreground mb-2">We share your information with trusted third-party service providers:</p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li><strong>Supabase:</strong> Database and authentication services (hosting in secure cloud infrastructure)</li>
                  <li><strong>Google:</strong> Calendar integration and video conferencing (Google Meet)</li>
                  <li><strong>Pesapal:</strong> Payment processing services</li>
                  <li><strong>Email Service Providers:</strong> For sending booking confirmations and notifications</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">4.2 Within the Platform</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li>Student information is shared with tutors for booked sessions</li>
                  <li>Tutor profiles are visible to students and parents browsing the platform</li>
                  <li>Reviews and ratings are displayed publicly on tutor profiles</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">4.3 Legal Requirements</h3>
                <p className="text-muted-foreground">
                  We may disclose your information if required by law, court order, or government regulation, or if we believe such action is necessary to comply with legal obligations, protect our rights, or ensure user safety.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>5. Data Security</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-2">We implement appropriate technical and organizational measures to protect your personal data:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Encryption of data in transit and at rest</li>
                <li>Secure authentication and access controls</li>
                <li>Regular security assessments and updates</li>
                <li>Restricted access to personal data on a need-to-know basis</li>
                <li>Secure backup and disaster recovery procedures</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                However, no method of transmission over the internet is 100% secure. While we strive to protect your personal information, we cannot guarantee absolute security.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>6. Your Rights Under Kenyan Law</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-2">Under the Kenya Data Protection Act, 2019, you have the following rights:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li><strong>Right to Access:</strong> Request a copy of your personal data we hold</li>
                <li><strong>Right to Rectification:</strong> Correct inaccurate or incomplete personal data</li>
                <li><strong>Right to Erasure:</strong> Request deletion of your personal data ("right to be forgotten")</li>
                <li><strong>Right to Restriction:</strong> Limit how we use your personal data</li>
                <li><strong>Right to Data Portability:</strong> Receive your data in a structured, commonly used format</li>
                <li><strong>Right to Object:</strong> Object to processing of your personal data</li>
                <li><strong>Right to Withdraw Consent:</strong> Withdraw consent at any time for consent-based processing</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                To exercise these rights, please contact us at <a href="mailto:privacy@lanatutors.africa" className="text-primary hover:underline">privacy@lanatutors.africa</a>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>7. Data Retention</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-2">We retain your personal information for as long as necessary to:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Provide our services to you</li>
                <li>Comply with legal obligations (e.g., tax records for 7 years)</li>
                <li>Resolve disputes and enforce agreements</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                When your data is no longer needed, we will securely delete or anonymize it.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>8. Cookies and Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-2">We use cookies and similar technologies to:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Keep you signed in</li>
                <li>Remember your preferences</li>
                <li>Understand how you use our platform</li>
                <li>Improve user experience</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                You can control cookies through your browser settings, but disabling cookies may affect platform functionality.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>9. Children's Privacy</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Many of our students are minors. We require parent or guardian consent for users under 18 years of age. We take special care to protect children's information and comply with child protection laws. Parents have the right to review, modify, or delete their child's personal information by contacting us.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>10. International Data Transfers</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Your data may be transferred to and processed in countries outside Kenya where our service providers operate. We ensure that such transfers comply with the Kenya Data Protection Act and implement appropriate safeguards, including standard contractual clauses and ensuring adequate levels of data protection.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>11. Changes to This Privacy Policy</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. We will notify you of significant changes by email or through a notice on our platform. The "Last updated" date at the top indicates when the policy was last revised.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>12. Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-muted-foreground space-y-2">
                <p>If you have questions about this Privacy Policy or wish to exercise your data rights, please contact us:</p>
                <div className="mt-4 space-y-1">
                  <p><strong>Lana Tutors</strong></p>
                  <p>First Floor, Arbor House, Arboretum Drive</p>
                  <p>Nairobi, Kenya</p>
                  <p>Email: <a href="mailto:privacy@lanatutors.africa" className="text-primary hover:underline">privacy@lanatutors.africa</a></p>
                  <p>Phone: <a href="tel:+254725252542" className="text-primary hover:underline">(+254) 725252542</a></p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>13. Office of the Data Protection Commissioner</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-2">
                If you believe your data protection rights have been violated, you have the right to lodge a complaint with the Office of the Data Protection Commissioner of Kenya:
              </p>
              <div className="mt-4 text-muted-foreground space-y-1">
                <p><strong>Office of the Data Protection Commissioner</strong></p>
                <p>Kalamu House, 5th Floor, Grevillea Grove</p>
                <p>Off Parklands Road, Westlands</p>
                <p>P.O. Box 3362-00100</p>
                <p>Nairobi, Kenya</p>
                <p>Email: <a href="mailto:info@odpc.go.ke" className="text-primary hover:underline">info@odpc.go.ke</a></p>
                <p>Website: <a href="https://www.odpc.go.ke" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.odpc.go.ke</a></p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 pt-8 border-t text-center">
          <Link to="/" className="text-primary hover:underline">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
