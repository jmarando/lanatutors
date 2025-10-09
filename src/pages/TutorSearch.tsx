import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { 
  Search, 
  Award, 
  Star, 
  MapPin, 
  Clock,
  Video,
  CheckCircle2,
  Calendar as CalendarIcon
} from "lucide-react";
import { Link } from "react-router-dom";

const TutorSearch = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [sortBy, setSortBy] = useState("rating");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedTutor, setSelectedTutor] = useState<any>(null);

  const tutors = [
    {
      id: 1,
      name: "Ms. Aisha Hassan",
      subjects: ["Mathematics", "Physics", "Chemistry"],
      school: "Alliance High School",
      experience: "8 years",
      rating: 4.9,
      reviews: 127,
      hourlyRate: 2200,
      location: "Nairobi",
      photo: "AH",
      bio: "Passionate about making complex concepts simple. Specialized in KCSE preparation with a 98% success rate. Former Alliance High School teacher with 8 years of experience.",
      verified: true,
      availability: ["09:00 AM", "10:00 AM", "02:00 PM", "03:00 PM", "04:00 PM"]
    },
    {
      id: 2,
      name: "Mr. David Kamau",
      subjects: ["English", "Literature", "Kiswahili"],
      school: "Starehe Boys Centre",
      experience: "6 years",
      rating: 4.8,
      reviews: 94,
      hourlyRate: 2000,
      location: "Nairobi",
      photo: "DK",
      bio: "Expert in English literature and composition. Helped over 200 students achieve A- and above in KCSE. Interactive and engaging teaching style.",
      verified: true,
      availability: ["11:00 AM", "12:00 PM", "03:00 PM", "05:00 PM"]
    },
    {
      id: 3,
      name: "Ms. Grace Wanjiru",
      subjects: ["Biology", "Chemistry"],
      school: "Kenya High School",
      experience: "10 years",
      rating: 5.0,
      reviews: 156,
      hourlyRate: 2400,
      location: "Nairobi",
      photo: "GW",
      bio: "Senior science teacher with distinction in curriculum development. Specialized in CBC and KCSE biology. Winner of National Teaching Excellence Award 2024.",
      verified: true,
      availability: ["09:00 AM", "11:00 AM", "01:00 PM", "04:00 PM"]
    },
    {
      id: 4,
      name: "Mr. James Omondi",
      subjects: ["Mathematics", "Computer Science"],
      school: "Mang'u High School",
      experience: "5 years",
      rating: 4.7,
      reviews: 78,
      hourlyRate: 1800,
      location: "Kiambu",
      photo: "JO",
      bio: "Tech-savvy math teacher combining traditional methods with modern tools. Great at explaining calculus and algebra for KCSE students.",
      verified: true,
      availability: ["10:00 AM", "02:00 PM", "03:00 PM", "06:00 PM"]
    },
    {
      id: 5,
      name: "Ms. Mercy Njeri",
      subjects: ["History", "Geography", "CRE"],
      school: "Loreto High School Limuru",
      experience: "7 years",
      rating: 4.9,
      reviews: 112,
      hourlyRate: 2100,
      location: "Kiambu",
      photo: "MN",
      bio: "Humanities specialist with a passion for African history. Makes learning engaging through storytelling and real-world connections.",
      verified: true,
      availability: ["09:00 AM", "11:00 AM", "02:00 PM", "04:00 PM"]
    },
    {
      id: 6,
      name: "Mr. Peter Mutua",
      subjects: ["Physics", "Mathematics"],
      school: "Nairobi School",
      experience: "12 years",
      rating: 4.8,
      reviews: 203,
      hourlyRate: 2500,
      location: "Nairobi",
      photo: "PM",
      bio: "Veteran physics teacher with PhD in Applied Physics. Specializes in mechanics and electricity for Form 3-4 students.",
      verified: true,
      availability: ["08:00 AM", "10:00 AM", "03:00 PM", "05:00 PM"]
    }
  ];

  const subjects = ["all", "Mathematics", "Physics", "Chemistry", "Biology", "English", "Literature", "Kiswahili", "History", "Geography", "Computer Science", "CRE"];

  const filteredTutors = tutors
    .filter(tutor => {
      const matchesSearch = 
        tutor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tutor.subjects.some(s => s.toLowerCase().includes(searchQuery.toLowerCase())) ||
        tutor.school.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesSubject = selectedSubject === "all" || tutor.subjects.includes(selectedSubject);
      
      return matchesSearch && matchesSubject;
    })
    .sort((a, b) => {
      if (sortBy === "rating") return b.rating - a.rating;
      if (sortBy === "price-low") return a.hourlyRate - b.hourlyRate;
      if (sortBy === "price-high") return b.hourlyRate - a.hourlyRate;
      if (sortBy === "reviews") return b.reviews - a.reviews;
      return 0;
    });

  const handleBooking = () => {
    if (selectedDate && selectedTime && selectedTutor) {
      alert(`Booking confirmed!\n\nTutor: ${selectedTutor.name}\nDate: ${selectedDate.toLocaleDateString()}\nTime: ${selectedTime}\nTotal: KES ${selectedTutor.hourlyRate}\n\nGoogle Meet link will be sent to your email.`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-background sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Award className="w-8 h-8 text-primary" />
            <span className="text-2xl font-bold">ElimuConnect</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="outline">Sign In</Button>
            </Link>
            <Link to="/login">
              <Button>Dashboard</Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold mb-8">Find Your Perfect Tutor</h1>

        {/* Search & Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search by name, subject, or school..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by subject" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map(subject => (
                <SelectItem key={subject} value={subject}>
                  {subject === "all" ? "All Subjects" : subject}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between mb-6">
          <p className="text-muted-foreground">
            Showing {filteredTutors.length} tutor{filteredTutors.length !== 1 ? 's' : ''}
          </p>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rating">Highest Rated</SelectItem>
              <SelectItem value="reviews">Most Reviews</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tutors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTutors.map((tutor) => (
            <Dialog key={tutor.id}>
              <DialogTrigger asChild>
                <Card className="card-hover cursor-pointer" onClick={() => setSelectedTutor(tutor)}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <Avatar className="w-16 h-16">
                        <AvatarFallback className="text-xl bg-accent text-accent-foreground">
                          {tutor.photo}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <h3 className="text-xl font-bold mb-1">{tutor.name}</h3>
                          {tutor.verified && (
                            <CheckCircle2 className="w-5 h-5 text-accent" />
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {tutor.subjects.slice(0, 2).map((subject, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {subject}
                            </Badge>
                          ))}
                          {tutor.subjects.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{tutor.subjects.length - 2}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-3">{tutor.school}</p>
                    
                    <div className="flex items-center gap-2 mb-3">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold">{tutor.rating}</span>
                      <span className="text-sm text-muted-foreground">
                        ({tutor.reviews} reviews)
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>{tutor.location}</span>
                      <Clock className="w-4 h-4 ml-2" />
                      <span>{tutor.experience}</span>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t">
                      <div className="text-2xl font-bold text-primary">
                        KES {tutor.hourlyRate.toLocaleString()}/hr
                      </div>
                      <Button size="sm">View Profile</Button>
                    </div>
                  </CardContent>
                </Card>
              </DialogTrigger>

              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-2xl">Tutor Profile</DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="about" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="about">About</TabsTrigger>
                    <TabsTrigger value="reviews">Reviews</TabsTrigger>
                    <TabsTrigger value="booking">Book Session</TabsTrigger>
                  </TabsList>

                  <TabsContent value="about" className="space-y-4">
                    <div className="flex items-start gap-6">
                      <Avatar className="w-24 h-24">
                        <AvatarFallback className="text-3xl bg-accent text-accent-foreground">
                          {tutor.photo}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-2xl font-bold">{tutor.name}</h3>
                          {tutor.verified && (
                            <CheckCircle2 className="w-6 h-6 text-accent" />
                          )}
                        </div>
                        <p className="text-muted-foreground mb-2">{tutor.school}</p>
                        <div className="flex items-center gap-2 mb-3">
                          <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                          <span className="text-xl font-semibold">{tutor.rating}</span>
                          <span className="text-muted-foreground">({tutor.reviews} reviews)</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {tutor.subjects.map((subject, idx) => (
                            <Badge key={idx} variant="secondary">{subject}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-bold mb-2">About</h4>
                      <p className="text-muted-foreground">{tutor.bio}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-bold mb-2">Experience</h4>
                        <p className="text-muted-foreground">{tutor.experience}</p>
                      </div>
                      <div>
                        <h4 className="font-bold mb-2">Location</h4>
                        <p className="text-muted-foreground">{tutor.location}</p>
                      </div>
                    </div>

                    <div className="bg-secondary p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Hourly Rate</p>
                          <p className="text-3xl font-bold text-primary">
                            KES {tutor.hourlyRate.toLocaleString()}
                          </p>
                        </div>
                        <Button size="lg">Book Now</Button>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="reviews" className="space-y-4">
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <Card key={i}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <Avatar>
                                <AvatarFallback>S{i}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-semibold">Student {i}</span>
                                  <div className="flex">
                                    {[...Array(5)].map((_, idx) => (
                                      <Star key={idx} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                    ))}
                                  </div>
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">2 weeks ago</p>
                                <p className="text-sm">
                                  Excellent tutor! Very patient and explains concepts clearly. My grades have improved significantly.
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="booking" className="space-y-4">
                    <div>
                      <h4 className="font-bold mb-4">Select Date & Time</h4>
                      <div className="flex flex-col md:flex-row gap-6">
                        <div className="flex-1">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            disabled={(date) => date < new Date()}
                            className="border rounded-lg p-3"
                          />
                        </div>
                        <div className="flex-1">
                          <h5 className="font-semibold mb-3">Available Time Slots</h5>
                          {!selectedDate ? (
                            <p className="text-sm text-muted-foreground">Please select a date first</p>
                          ) : (
                            <div className="grid grid-cols-2 gap-2">
                              {tutor.availability.map((time) => (
                                <Button
                                  key={time}
                                  variant={selectedTime === time ? "default" : "outline"}
                                  onClick={() => setSelectedTime(time)}
                                  className={selectedTime === time ? "bg-accent" : ""}
                                >
                                  {time}
                                </Button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {selectedDate && selectedTime && (
                      <div className="bg-secondary p-6 rounded-lg space-y-4">
                        <h4 className="font-bold">Booking Summary</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Tutor:</span>
                            <span className="font-semibold">{tutor.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Date:</span>
                            <span className="font-semibold">{selectedDate.toLocaleDateString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Time:</span>
                            <span className="font-semibold">{selectedTime}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Duration:</span>
                            <span className="font-semibold">1 hour</span>
                          </div>
                          <Separator className="my-2" />
                          <div className="flex justify-between text-lg">
                            <span className="font-bold">Total:</span>
                            <span className="font-bold text-primary">
                              KES {tutor.hourlyRate.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <Button className="w-full" size="lg" onClick={handleBooking}>
                          Confirm & Pay with M-Pesa
                        </Button>
                        <p className="text-xs text-center text-muted-foreground">
                          <Video className="w-4 h-4 inline mr-1" />
                          Google Meet link will be sent to your email
                        </p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TutorSearch;