import { useEffect } from "react";
import lanaLogo from "@/assets/lana-tutors-logo-hd.png";

const TutorGuidePrintable = () => {
  useEffect(() => {
    document.title = "LANA Tutors - Tutor Dashboard Guide";
  }, []);

  return (
    <div className="printable-guide">
      {/* Cover Page */}
      <div className="page cover-page">
        <div className="cover-content">
          <img src={lanaLogo} alt="LANA Tutors" className="cover-logo" />
          <h1 className="cover-title">Tutor Dashboard Guide</h1>
          <p className="cover-subtitle">Complete Guide to Using Your Tutor Dashboard</p>
          <div className="cover-footer">
            <p>LANA Tutors</p>
            <p>© {new Date().getFullYear()} All Rights Reserved</p>
          </div>
        </div>
      </div>

      {/* Table of Contents */}
      <div className="page toc-page">
        <h2 className="toc-title">Table of Contents</h2>
        <div className="toc-list">
          <div className="toc-item">
            <span>1. Accessing Your Tutor Dashboard</span>
            <span className="toc-page-num">3</span>
          </div>
          <div className="toc-item toc-sub">
            <span>1.1 First Time Login</span>
            <span className="toc-page-num">3</span>
          </div>
          <div className="toc-item toc-sub">
            <span>1.2 Navigating the Dashboard</span>
            <span className="toc-page-num">3</span>
          </div>
          
          <div className="toc-item">
            <span>2. Understanding Your Dashboard</span>
            <span className="toc-page-num">4</span>
          </div>
          
          <div className="toc-item">
            <span>3. Setting Your Availability</span>
            <span className="toc-page-num">5</span>
          </div>
          <div className="toc-item toc-sub">
            <span>3.1 Initial Availability Setup</span>
            <span className="toc-page-num">5</span>
          </div>
          <div className="toc-item toc-sub">
            <span>3.2 Managing Your Calendar</span>
            <span className="toc-page-num">5</span>
          </div>
          <div className="toc-item toc-sub">
            <span>3.3 Understanding Calendar Colors</span>
            <span className="toc-page-num">6</span>
          </div>
          <div className="toc-item toc-sub">
            <span>3.4 Best Practices</span>
            <span className="toc-page-num">6</span>
          </div>
          
          <div className="toc-item">
            <span>4. Managing Your Sessions</span>
            <span className="toc-page-num">7</span>
          </div>
          
          <div className="toc-item">
            <span>5. Connecting Google Calendar</span>
            <span className="toc-page-num">8</span>
          </div>
          
          <div className="toc-item">
            <span>6. Tracking Your Earnings</span>
            <span className="toc-page-num">9</span>
          </div>
          
          <div className="toc-item">
            <span>7. Managing Student Reviews</span>
            <span className="toc-page-num">10</span>
          </div>
          
          <div className="toc-item">
            <span>8. Editing Your Profile</span>
            <span className="toc-page-num">11</span>
          </div>
          
          <div className="toc-item">
            <span>9. Best Practices for Success</span>
            <span className="toc-page-num">12</span>
          </div>
          
          <div className="toc-item">
            <span>10. Troubleshooting Common Issues</span>
            <span className="toc-page-num">13</span>
          </div>
          
          <div className="toc-item">
            <span>11. Need Help?</span>
            <span className="toc-page-num">14</span>
          </div>
        </div>
      </div>

      {/* Section 1: Accessing Your Tutor Dashboard */}
      <div className="page">
        <h2 className="section-title">1. Accessing Your Tutor Dashboard</h2>
        
        <h3 className="subsection-title">1.1 First Time Login</h3>
        <ol className="guide-list">
          <li>
            <strong>Visit the LANA Tutors website:</strong>
            <p>Go to the LANA Tutors platform and click "Login" in the top right corner.</p>
          </li>
          <li>
            <strong>Enter your credentials:</strong>
            <p>Use the email and password you created during your tutor application process.</p>
          </li>
          <li>
            <strong>Complete your profile setup:</strong>
            <p>If this is your first time logging in, you'll be directed to complete your tutor profile. Make sure to fill in:</p>
            <ul>
              <li>Your bio and teaching experience</li>
              <li>Subjects you teach</li>
              <li>Teaching levels (IGCSE, A-Level, etc.)</li>
              <li><strong>CRITICAL: Your pricing tiers (Standard Rate and Advanced Rate in Step 3)</strong></li>
              <li>Qualifications and curriculum expertise</li>
            </ul>
            <p className="warning-box"><strong>⚠️ Important:</strong> You MUST set your Standard and Advanced hourly rates in Step 3 of profile setup. Without these rates, students cannot book sessions with you.</p>
          </li>
        </ol>

        <h3 className="subsection-title">1.2 Navigating the Dashboard</h3>
        <p>Once logged in, you'll land on your Tutor Dashboard. The main navigation includes:</p>
        <ul className="guide-list">
          <li><strong>Dashboard:</strong> Your main hub for overview and statistics</li>
          <li><strong>Availability:</strong> Manage your teaching schedule</li>
          <li><strong>Profile:</strong> View and edit your tutor profile</li>
        </ul>
      </div>

      {/* Section 2: Understanding Your Dashboard */}
      <div className="page">
        <h2 className="section-title">2. Understanding Your Dashboard</h2>
        
        <p>Your dashboard displays key metrics and information:</p>
        
        <div className="info-box">
          <h4>Monthly Earnings (Net)</h4>
          <p>Shows your earnings for the current month after LANA's 30% commission.</p>
        </div>

        <div className="info-box">
          <h4>Total Earnings (Gross)</h4>
          <p>Your total accumulated earnings before commission (lifetime).</p>
        </div>

        <div className="info-box">
          <h4>Total Sessions</h4>
          <p>The number of sessions you've completed on the platform.</p>
        </div>

        <div className="info-box">
          <h4>Your Rating</h4>
          <p>Average rating from student reviews (out of 5 stars).</p>
        </div>

        <h3 className="subsection-title">Dashboard Tabs</h3>
        <ul className="guide-list">
          <li><strong>Upcoming Sessions:</strong> View all your scheduled sessions with student details, date, time, subject, and Google Meet link</li>
          <li><strong>Manage Availability:</strong> Set and update your teaching schedule</li>
          <li><strong>Reviews:</strong> View feedback from students</li>
        </ul>
      </div>

      {/* Section 3: Setting Your Availability */}
      <div className="page">
        <h2 className="section-title">3. Setting Your Availability</h2>
        
        <h3 className="subsection-title">3.1 Initial Availability Setup</h3>
        <p>There are two ways to create your initial availability:</p>
        
        <div className="method-box">
          <h4>Method 1: Generate Weekly Template</h4>
          <ol className="guide-list">
            <li>Click on "Manage Availability" tab</li>
            <li>Click "Generate Weekly Availability"</li>
            <li>Select your preferred time slots for each day of the week</li>
            <li>The system will create recurring availability for the next 4 weeks</li>
          </ol>
        </div>

        <div className="method-box">
          <h4>Method 2: Manual Selection</h4>
          <ol className="guide-list">
            <li>Navigate to the calendar view</li>
            <li>Click on individual time slots to mark them as available</li>
            <li>Add slots one by one as needed</li>
          </ol>
        </div>

        <h3 className="subsection-title">3.2 Managing Your Calendar</h3>
        <p><strong>Blocking Time:</strong></p>
        <ul className="guide-list">
          <li>Click on an available (green) slot to block it</li>
          <li>Blocked slots appear in yellow and won't be bookable by students</li>
          <li>You can unblock slots by clicking them again</li>
        </ul>

        <p><strong>Blocking Full Days:</strong></p>
        <ul className="guide-list">
          <li>Use the "Block Specific Days" feature</li>
          <li>Select date range and reason (e.g., "Holiday", "Personal")</li>
          <li>All slots in that period will be blocked</li>
        </ul>
      </div>

      {/* Section 3 continued */}
      <div className="page">
        <h3 className="subsection-title">3.3 Understanding Calendar Colors</h3>
        <div className="color-legend">
          <div className="legend-item">
            <span className="color-box green"></span>
            <strong>Green:</strong> Available for booking
          </div>
          <div className="legend-item">
            <span className="color-box yellow"></span>
            <strong>Yellow:</strong> Blocked by you (not available)
          </div>
          <div className="legend-item">
            <span className="color-box blue"></span>
            <strong>Blue:</strong> Booked session (confirmed)
          </div>
        </div>

        <h3 className="subsection-title">3.4 Best Practices</h3>
        <ul className="guide-list">
          <li><strong>Update regularly:</strong> Keep your availability current, ideally 2-3 weeks in advance</li>
          <li><strong>Be consistent:</strong> Students prefer tutors with predictable schedules</li>
          <li><strong>Peak hours:</strong> Consider adding slots during after-school hours (3pm-8pm) and weekends</li>
          <li><strong>Buffer time:</strong> Leave 5-10 minutes between sessions for breaks</li>
          <li><strong>Block early:</strong> If you know you won't be available, block those times as soon as possible</li>
        </ul>
      </div>

      {/* Section 4: Managing Your Sessions */}
      <div className="page">
        <h2 className="section-title">4. Managing Your Sessions</h2>
        
        <h3 className="subsection-title">Viewing Upcoming Sessions</h3>
        <p>In the "Upcoming Sessions" tab, you'll see:</p>
        <ul className="guide-list">
          <li><strong>Student Name:</strong> Who you'll be teaching</li>
          <li><strong>Date & Time:</strong> When the session is scheduled</li>
          <li><strong>Subject:</strong> What you'll be teaching</li>
          <li><strong>Meeting Link:</strong> Google Meet link for online sessions</li>
        </ul>

        <h3 className="subsection-title">Joining an Online Session</h3>
        <ol className="guide-list">
          <li>5-10 minutes before the session, click the "Join Meeting" button</li>
          <li>This will open the Google Meet link in a new tab</li>
          <li>Ensure your camera and microphone are working</li>
          <li>Wait for the student to join</li>
        </ol>

        <div className="tip-box">
          <strong>💡 Pro Tip:</strong> Join the meeting 5 minutes early to test your setup and be ready when the student arrives.
        </div>

        <h3 className="subsection-title">Session Preparation</h3>
        <ul className="guide-list">
          <li>Review the subject and student's level before the session</li>
          <li>Prepare relevant materials or resources</li>
          <li>Check that you have a stable internet connection</li>
          <li>Ensure you're in a quiet, well-lit environment</li>
        </ul>
      </div>

      {/* Section 5: Connecting Google Calendar */}
      <div className="page">
        <h2 className="section-title">5. Connecting Google Calendar</h2>
        
        <p><strong>Why Connect Google Calendar?</strong></p>
        <ul className="guide-list">
          <li>Automatically sync all your LANA bookings to your personal calendar</li>
          <li>Get reminders and notifications from Google</li>
          <li>Avoid double-booking with other commitments</li>
          <li>Access your schedule across all devices</li>
        </ul>

        <h3 className="subsection-title">How to Connect</h3>
        <ol className="guide-list">
          <li>Go to your Tutor Dashboard</li>
          <li>Look for "Connect Google Calendar" button</li>
          <li>Click and authorize LANA to access your Google Calendar</li>
          <li>Once connected, all new bookings will automatically appear in your Google Calendar</li>
        </ol>

        <div className="warning-box">
          <strong>⚠️ Note:</strong> You can disconnect at any time from the same section. Past bookings will remain in your calendar, but new ones won't sync.
        </div>
      </div>

      {/* Section 6: Tracking Your Earnings */}
      <div className="page">
        <h2 className="section-title">6. Tracking Your Earnings</h2>
        
        <h3 className="subsection-title">Understanding Your Earnings</h3>
        
        <div className="info-box">
          <h4>Gross Earnings</h4>
          <p>The total amount before LANA's commission. This is what students pay for your sessions.</p>
        </div>

        <div className="info-box">
          <h4>Net Earnings (Your Take-Home)</h4>
          <p>After LANA's 30% commission is deducted. This is what you actually receive.</p>
          <p className="formula">Net Earnings = Gross Earnings × 70%</p>
        </div>

        <h3 className="subsection-title">Commission Breakdown</h3>
        <ul className="guide-list">
          <li><strong>LANA Commission:</strong> 30% of each session fee</li>
          <li><strong>Your Earnings:</strong> 70% of each session fee</li>
        </ul>

        <div className="example-box">
          <h4>Example:</h4>
          <p>If a student books a session for KES 3,000:</p>
          <ul>
            <li>LANA Commission: KES 900 (30%)</li>
            <li>Your Earnings: KES 2,100 (70%)</li>
          </ul>
        </div>

        <h3 className="subsection-title">Viewing Your Earnings</h3>
        <ul className="guide-list">
          <li><strong>This Month:</strong> Check the "Monthly Earnings (Net)" card on your dashboard</li>
          <li><strong>Total Lifetime:</strong> View "Total Earnings (Gross)" for all-time earnings</li>
        </ul>

        <h3 className="subsection-title">Payment Schedule</h3>
        <p>Payments are processed according to LANA's payment schedule. Contact admin for specific details about:</p>
        <ul className="guide-list">
          <li>Payment dates</li>
          <li>Minimum withdrawal amounts</li>
          <li>Payment methods</li>
        </ul>
      </div>

      {/* Section 7: Managing Student Reviews */}
      <div className="page">
        <h2 className="section-title">7. Managing Student Reviews</h2>
        
        <p>Student reviews are crucial for your success on the platform. They appear on your public profile and influence booking decisions.</p>

        <h3 className="subsection-title">Viewing Reviews</h3>
        <ol className="guide-list">
          <li>Navigate to the "Reviews" tab on your dashboard</li>
          <li>You'll see all approved reviews with:</li>
          <ul>
            <li>Star rating (1-5 stars)</li>
            <li>Written feedback from students</li>
            <li>Date of review</li>
          </ul>
        </ol>

        <h3 className="subsection-title">How Reviews Affect You</h3>
        <ul className="guide-list">
          <li><strong>Profile Rating:</strong> Your average rating appears on your profile and dashboard</li>
          <li><strong>Search Rankings:</strong> Higher-rated tutors appear first in search results</li>
          <li><strong>Student Trust:</strong> Positive reviews build credibility and encourage bookings</li>
        </ul>

        <h3 className="subsection-title">Tips for Getting Great Reviews</h3>
        <ul className="guide-list">
          <li>Be punctual - join sessions on time</li>
          <li>Come prepared with materials and lesson plans</li>
          <li>Be patient and encouraging with students</li>
          <li>Provide clear explanations and examples</li>
          <li>Follow up on student progress between sessions</li>
          <li>Maintain professional communication</li>
          <li>Ask students if they have questions at the end of each session</li>
        </ul>

        <div className="tip-box">
          <strong>💡 Pro Tip:</strong> After a particularly good session, you can politely encourage the student or parent to leave a review if they found the session helpful.
        </div>
      </div>

      {/* Section 8: Editing Your Profile */}
      <div className="page">
        <h2 className="section-title">8. Editing Your Profile</h2>
        
        <p>Your profile is your storefront - keep it updated and professional!</p>

        <h3 className="subsection-title">When to Update Your Profile</h3>
        <ul className="guide-list">
          <li>You gain new qualifications or certifications</li>
          <li>You want to add or remove subjects you teach</li>
          <li>You need to update your bio or teaching experience</li>
          <li>You want to change your profile photo</li>
          <li>Your teaching approach or specializations change</li>
        </ul>

        <h3 className="subsection-title">How to Edit Your Profile</h3>
        <ol className="guide-list">
          <li>Click on "Profile" in the main navigation</li>
          <li>Review your current profile information</li>
          <li>Click "Edit Profile" or similar button</li>
          <li>Make your changes in the profile editor</li>
          <li>Save your changes</li>
        </ol>

        <div className="warning-box">
          <strong>⚠️ Important:</strong> Some profile changes may require admin approval. You'll be notified if this is the case.
        </div>

        <h3 className="subsection-title">Profile Best Practices</h3>
        <ul className="guide-list">
          <li><strong>Professional Photo:</strong> Use a clear, friendly headshot</li>
          <li><strong>Detailed Bio:</strong> Explain your teaching philosophy and experience (2-3 paragraphs)</li>
          <li><strong>Accurate Subjects:</strong> Only list subjects you're confident teaching</li>
          <li><strong>Highlight Achievements:</strong> Mention awards, high student success rates, or special qualifications</li>
          <li><strong>Keep it Current:</strong> Update at least once per term</li>
        </ul>
      </div>

      {/* Section 9: Best Practices for Success */}
      <div className="page">
        <h2 className="section-title">9. Best Practices for Success</h2>
        
        <h3 className="subsection-title">Maximizing Your Bookings</h3>
        <ul className="guide-list">
          <li><strong>Maintain high availability:</strong> The more slots you offer, the more likely students will book</li>
          <li><strong>Be responsive:</strong> Check your dashboard daily for new bookings</li>
          <li><strong>Update promptly:</strong> If plans change, update your availability immediately</li>
          <li><strong>Offer peak hours:</strong> Evenings (4pm-8pm) and weekends see the most bookings</li>
          <li><strong>Diversify subjects:</strong> If qualified, offer multiple subjects to attract more students</li>
        </ul>

        <h3 className="subsection-title">Maintaining Professional Standards</h3>
        <ul className="guide-list">
          <li><strong>Punctuality:</strong> Always join sessions on time or a few minutes early</li>
          <li><strong>Preparation:</strong> Review student information and prepare materials beforehand</li>
          <li><strong>Communication:</strong> Be clear, patient, and encouraging</li>
          <li><strong>Technical Setup:</strong> Ensure stable internet, working camera/mic, quiet environment</li>
          <li><strong>Session Quality:</strong> Focus fully on the student during sessions - no distractions</li>
          <li><strong>Follow-through:</strong> Provide homework or follow-up materials when appropriate</li>
        </ul>

        <h3 className="subsection-title">Growing Your Reputation</h3>
        <ul className="guide-list">
          <li>Deliver consistently excellent sessions</li>
          <li>Encourage satisfied students to leave reviews</li>
          <li>Build relationships with regular students</li>
          <li>Demonstrate measurable student improvement</li>
          <li>Stay updated with curriculum changes</li>
          <li>Be professional in all communications</li>
        </ul>

        <div className="tip-box">
          <strong>💡 Success Formula:</strong> Availability + Quality Teaching + Professional Conduct = More Bookings & Higher Earnings
        </div>
      </div>

      {/* Section 10: Troubleshooting Common Issues */}
      <div className="page">
        <h2 className="section-title">10. Troubleshooting Common Issues</h2>
        
        <div className="issue-box">
          <h4>Issue: Profile Submission Problems</h4>
          <p><strong>Problem:</strong> Can't complete profile setup or students can't book</p>
          <p><strong>Solution:</strong></p>
          <ul>
            <li>Ensure you've completed ALL required fields, especially in Step 3</li>
            <li><strong>Critical:</strong> Make sure you've set BOTH Standard Rate AND Advanced Rate in the pricing section</li>
            <li>Check that your profile photo has been uploaded</li>
            <li>Verify all subjects and qualifications are filled in</li>
            <li>If still having issues, contact support</li>
          </ul>
        </div>

        <div className="issue-box">
          <h4>Issue: No Bookings Appearing</h4>
          <p><strong>Possible Causes:</strong></p>
          <ul>
            <li>No availability set - students can't see available slots</li>
            <li>All slots are blocked or in the past</li>
            <li>Profile not fully completed or approved</li>
          </ul>
          <p><strong>Solution:</strong></p>
          <ul>
            <li>Check "Manage Availability" - ensure you have green (available) slots</li>
            <li>Generate weekly availability if starting fresh</li>
            <li>Verify your profile is complete and approved</li>
          </ul>
        </div>

        <div className="issue-box">
          <h4>Issue: Meeting Link Not Working</h4>
          <p><strong>Solution:</strong></p>
          <ul>
            <li>Refresh the dashboard page</li>
            <li>Try clicking the link again closer to session time</li>
            <li>Ensure you're logged into a Google account</li>
            <li>Check your internet connection</li>
            <li>Contact support if the link is missing or broken</li>
          </ul>
        </div>

        <div className="issue-box">
          <h4>Issue: Earnings Don't Match Expectations</h4>
          <p><strong>Remember:</strong></p>
          <ul>
            <li>Dashboard shows NET earnings (after 30% commission)</li>
            <li>Only completed sessions count toward earnings</li>
            <li>Cancelled sessions won't appear in earnings</li>
          </ul>
          <p><strong>Solution:</strong></p>
          <ul>
            <li>Cross-reference "Total Sessions" with your completed bookings</li>
            <li>Calculate: Expected Gross × 0.70 = Your Net Earnings</li>
            <li>Contact admin if numbers still don't add up</li>
          </ul>
        </div>

        <div className="issue-box">
          <h4>Issue: Google Calendar Not Syncing</h4>
          <p><strong>Solution:</strong></p>
          <ul>
            <li>Disconnect and reconnect your Google Calendar</li>
            <li>Ensure you granted all necessary permissions</li>
            <li>Check that bookings appear in the correct Google account</li>
            <li>Allow up to 5 minutes for new bookings to sync</li>
          </ul>
        </div>
      </div>

      {/* Section 11: Need Help? */}
      <div className="page">
        <h2 className="section-title">11. Need Help?</h2>
        
        <p>If you encounter any issues not covered in this guide, LANA Tutors support is here to help!</p>

        <div className="contact-box">
          <h4>Contact Support</h4>
          <ul className="guide-list">
            <li><strong>Email:</strong> support@lanatutors.com</li>
            <li><strong>Phone/WhatsApp:</strong> [Insert phone number]</li>
            <li><strong>Response Time:</strong> Within 24 hours on business days</li>
          </ul>
        </div>

        <h3 className="subsection-title">When Contacting Support, Include:</h3>
        <ul className="guide-list">
          <li>Your full name and email address</li>
          <li>Clear description of the issue</li>
          <li>Screenshots if applicable</li>
          <li>What you've already tried to fix the problem</li>
          <li>Your tutor ID (if you have it)</li>
        </ul>

        <h3 className="subsection-title">Additional Resources</h3>
        <ul className="guide-list">
          <li><strong>FAQ Section:</strong> Check the website for answers to common questions</li>
          <li><strong>Video Tutorials:</strong> Coming soon to help visual learners</li>
          <li><strong>Tutor Community:</strong> Connect with other tutors to share tips and experiences</li>
        </ul>

        <div className="success-box">
          <h4>🎉 Welcome to the LANA Tutors Family!</h4>
          <p>We're excited to have you as part of our team. Your expertise and dedication make a real difference in students' lives. Here's to a successful tutoring journey!</p>
        </div>

        <div className="footer-note">
          <p><strong>Document Version:</strong> 1.0</p>
          <p><strong>Last Updated:</strong> {new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <p>For the most up-to-date information, always refer to your dashboard and official LANA communications.</p>
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 2cm 2cm 3cm 2cm;
          }

          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }

        .printable-guide {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          color: #1a1a1a;
          line-height: 1.6;
          max-width: 210mm;
          margin: 0 auto;
          background: white;
        }

        .page {
          page-break-after: always;
          padding: 20px;
          min-height: 277mm;
          position: relative;
        }

        .page:last-child {
          page-break-after: auto;
        }

        /* Cover Page */
        .cover-page {
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .cover-content {
          max-width: 500px;
        }

        .cover-logo {
          max-width: 200px;
          margin: 0 auto 2rem;
          filter: brightness(0) invert(1);
        }

        .cover-title {
          font-size: 3rem;
          font-weight: 800;
          margin-bottom: 1rem;
          line-height: 1.2;
        }

        .cover-subtitle {
          font-size: 1.5rem;
          margin-bottom: 4rem;
          opacity: 0.95;
        }

        .cover-footer {
          margin-top: 6rem;
          font-size: 0.9rem;
          opacity: 0.8;
        }

        /* Table of Contents */
        .toc-page {
          padding-top: 40px;
        }

        .toc-title {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 2rem;
          color: #667eea;
          border-bottom: 3px solid #667eea;
          padding-bottom: 0.5rem;
        }

        .toc-list {
          margin-top: 1.5rem;
        }

        .toc-item {
          display: flex;
          justify-content: space-between;
          padding: 0.75rem 0;
          border-bottom: 1px dotted #ddd;
        }

        .toc-sub {
          padding-left: 2rem;
          font-size: 0.95rem;
        }

        .toc-page-num {
          font-weight: 600;
          color: #667eea;
        }

        /* Section Styles */
        .section-title {
          font-size: 1.8rem;
          font-weight: 700;
          color: #667eea;
          margin-bottom: 1.5rem;
          border-bottom: 2px solid #667eea;
          padding-bottom: 0.5rem;
        }

        .subsection-title {
          font-size: 1.3rem;
          font-weight: 600;
          color: #764ba2;
          margin-top: 1.5rem;
          margin-bottom: 1rem;
        }

        .guide-list {
          margin: 1rem 0;
          padding-left: 1.5rem;
        }

        .guide-list li {
          margin-bottom: 0.75rem;
        }

        .guide-list p {
          margin: 0.5rem 0;
        }

        .guide-list ul {
          margin-top: 0.5rem;
        }

        /* Info Boxes */
        .info-box, .method-box, .example-box, .tip-box, .warning-box, .issue-box, .contact-box, .success-box {
          padding: 1rem;
          margin: 1rem 0;
          border-radius: 8px;
          border-left: 4px solid;
        }

        .info-box {
          background: #f0f4ff;
          border-left-color: #667eea;
        }

        .method-box {
          background: #f5f3ff;
          border-left-color: #764ba2;
        }

        .example-box {
          background: #fef3c7;
          border-left-color: #f59e0b;
        }

        .tip-box {
          background: #d1fae5;
          border-left-color: #10b981;
        }

        .warning-box {
          background: #fee2e2;
          border-left-color: #ef4444;
        }

        .issue-box {
          background: #f3f4f6;
          border-left-color: #6b7280;
        }

        .contact-box {
          background: #e0e7ff;
          border-left-color: #667eea;
        }

        .success-box {
          background: #d1fae5;
          border-left-color: #10b981;
          text-align: center;
        }

        .info-box h4, .method-box h4, .example-box h4, .tip-box strong:first-child, 
        .warning-box strong:first-child, .issue-box h4, .contact-box h4, .success-box h4 {
          margin-top: 0;
          margin-bottom: 0.5rem;
          font-weight: 600;
        }

        .formula {
          font-family: 'Courier New', monospace;
          background: rgba(0,0,0,0.05);
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          display: inline-block;
          margin-top: 0.5rem;
        }

        /* Color Legend */
        .color-legend {
          margin: 1rem 0;
        }

        .legend-item {
          display: flex;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .color-box {
          width: 30px;
          height: 30px;
          border-radius: 4px;
          margin-right: 1rem;
          border: 1px solid #ddd;
        }

        .color-box.green {
          background: #10b981;
        }

        .color-box.yellow {
          background: #fbbf24;
        }

        .color-box.blue {
          background: #3b82f6;
        }

        /* Footer */
        .footer-note {
          margin-top: 2rem;
          padding-top: 1rem;
          border-top: 1px solid #ddd;
          font-size: 0.85rem;
          color: #6b7280;
        }

        /* Print Styles */
        @media print {
          .page {
            padding: 15mm;
          }

          .cover-page {
            padding: 0;
          }

          a {
            color: inherit;
            text-decoration: none;
          }

          .page::after {
            content: counter(page);
            position: absolute;
            bottom: 15mm;
            right: 15mm;
            font-size: 0.9rem;
            color: #6b7280;
          }

          .cover-page::after, .toc-page::after {
            content: '';
          }
        }

        /* Screen View */
        @media screen {
          .printable-guide {
            padding: 2rem;
          }

          .page {
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            margin-bottom: 2rem;
            background: white;
          }
        }
      `}</style>
    </div>
  );
};

export default TutorGuidePrintable;
