import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Star } from "lucide-react";

const TutorSearch = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [sortBy, setSortBy] = useState("rating");

  const tutors = [
    {
      id: 1,
      name: "Sarah Wanjiru",
      subjects: ["Math", "Physics"],
      school: "University of Nairobi",
      rating: 4.9,
      reviews: 85,
      hourlyRate: 1500,
      photo: "SW",
    },
    {
      id: 2,
      name: "Jane Muthoni",
      subjects: ["English", "Kiswahili"],
      school: "Moi University",
      rating: 4.9,
      reviews: 95,
      hourlyRate: 1200,
      photo: "JM",
    },
    {
      id: 3,
      name: "John Kariuki",
      subjects: ["Math"],
      school: "Egerton University",
      rating: 4.9,
      reviews: 102,
      hourlyRate: 1550,
      photo: "JK",
    },
    {
      id: 4,
      name: "David Kamau",
      subjects: ["Chemistry", "Biology"],
      school: "Kenyatta University",
      rating: 4.8,
      reviews: 72,
      hourlyRate: 1400,
      photo: "DK",
    },
    {
      id: 5,
      name: "Mary Akinyi",
      subjects: ["Physics"],
      school: "Jomo Kenyatta University of Agriculture and Technology",
      rating: 4.9,
      reviews: 65,
      hourlyRate: 1600,
      photo: "MA",
    },
    {
      id: 6,
      name: "Peter Otieno",
      subjects: ["History", "Geography"],
      school: "Maseno University",
      rating: 4.7,
      reviews: 61,
      hourlyRate: 1300,
      photo: "PO",
    }
  ];

  const subjects = ["all", "Math", "Physics", "Chemistry", "Biology", "English", "Kiswahili", "History", "Geography"];

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

  return (
    <div className="min-h-screen bg-secondary/20">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold mb-3">Find Your Perfect Tutor</h1>
          <p className="text-muted-foreground text-lg">
            Search our network of expert tutors to find the right one for you.
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-8 max-w-5xl mx-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search by name, subject, school..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
          
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="w-56 h-12">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map(subject => (
                <SelectItem key={subject} value={subject}>
                  {subject === "all" ? "All" : subject}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-56 h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rating">Sort by Rating</SelectItem>
              <SelectItem value="reviews">Most Reviews</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tutors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {filteredTutors.map((tutor) => (
            <Card key={tutor.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <Avatar className="w-20 h-20 border-4 border-cyan-600">
                    <AvatarFallback className="text-lg bg-gradient-to-br from-cyan-600 to-cyan-700 text-white">
                      {tutor.photo}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold mb-1">{tutor.name}</h3>
                    <p className="text-cyan-600 font-medium text-sm mb-1">
                      {tutor.subjects.join(", ")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {tutor.school}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1.5 mb-4">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-bold text-lg">{tutor.rating}</span>
                  <span className="text-muted-foreground">({tutor.reviews} reviews)</span>
                </div>

                <div className="text-2xl font-bold text-orange-600 mb-4">
                  KES {tutor.hourlyRate}/hr
                </div>

                <Button 
                  onClick={() => navigate(`/tutors/${tutor.id}`)}
                  className="w-full bg-cyan-600 hover:bg-cyan-700 text-white h-11"
                >
                  View Profile
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TutorSearch;
