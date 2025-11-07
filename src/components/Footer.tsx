import { Mail, Phone, MapPin } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-card text-foreground border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* About */}
          <div>
            <h4 className="text-primary mb-2">ReClaim</h4>
            <p className="text-sm text-muted-foreground">
              PLV Lost and Found System - Official platform of Pamantasan ng Lungsod ng Valenzuela
            </p>
          </div>

          {/* Contact Information */}
          <div>
            <h4 className="text-primary mb-2">Contact Guard Post</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-accent" />
                <span>(02) 8292-1641</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-accent" />
                <span>lostandfound@plv.edu.ph</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-accent" />
                <span>Main Guard Post, PLV Campus</span>
              </div>
            </div>
          </div>

          {/* Office Hours */}
          <div>
            <h4 className="text-primary mb-2">Office Hours</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Monday - Friday: 7:00 AM - 7:00 PM</p>
              <p>Saturday: 8:00 AM - 5:00 PM</p>
              <p>Sunday: Closed</p>
            </div>
          </div>
        </div>

        <div className="border-t border-border mt-6 pt-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Pamantasan ng Lungsod ng Valenzuela. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};