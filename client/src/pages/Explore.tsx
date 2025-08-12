import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Globe, Star } from "lucide-react";
import { useState } from "react";

const destinations = [
  {
    id: "1",
    name: "Paris, France",
    description:
      "The City of Light, known for the Eiffel Tower and exquisite cuisine.",
    image:
      "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=500&auto=format&fit=crop&q=60",
    rating: 4.8,
  },
  {
    id: "2",
    name: "Tokyo, Japan",
    description: "A vibrant metropolis blending ultramodern and traditional.",
    image:
      "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=500&auto=format&fit=crop&q=60",
    rating: 4.9,
  },
  {
    id: "3",
    name: "Rome, Italy",
    description:
      "The Eternal City with ancient ruins and Renaissance masterpieces.",
    image:
      "https://images.unsplash.com/photo-1525874684015-58379d421a52?w=500&auto=format&fit=crop&q=60",
    rating: 4.7,
  },
  {
    id: "4",
    name: "Bali, Indonesia",
    description:
      "A tropical paradise with beaches, volcanoes, and unique culture.",
    image:
      "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=500&auto=format&fit=crop&q=60",
    rating: 4.6,
  },
  {
    id: "5",
    name: "New York City, USA",
    description:
      "The Big Apple, a global center for culture, finance, and entertainment.",
    image:
      "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=500&auto=format&fit=crop&q=60",
    rating: 4.7,
  },
  {
    id: "6",
    name: "Santorini, Greece",
    description:
      "Famous for its stunning sunsets, white-washed buildings, and blue domes.",
    image:
      "https://images.unsplash.com/photo-1469796466635-455ede028aca?w=500&auto=format&fit=crop&q=60",
    rating: 4.9,
  },
];

export default function Explore() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredDestinations = destinations.filter((dest) =>
    dest.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />

        <main className="flex-1 overflow-auto">
          <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
            <div className="flex h-16 items-center gap-4 px-6">
              <SidebarTrigger />
              <div className="flex-1 flex items-center justify-between">
                <h1 className="text-2xl font-bold text-primary">
                  Explore Destinations
                </h1>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search destinations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </header>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDestinations.map((destination) => (
                <Card
                  key={destination.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div
                    className="h-48 bg-cover bg-center"
                    style={{
                      backgroundImage: `url(${destination.image})`,
                    }}
                  />
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold">
                        {destination.name}
                      </h3>
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-400 mr-1 fill-yellow-400" />
                        <span>{destination.rating}</span>
                      </div>
                    </div>
                    <p className="text-muted-foreground text-sm mb-4">
                      {destination.description}
                    </p>
                    <div className="flex justify-between items-center">
                      <Button variant="outline" size="sm">
                        <MapPin className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Globe className="h-4 w-4 mr-2" />
                        Plan Trip
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredDestinations.length === 0 && (
              <div className="text-center py-12">
                <p className="text-lg text-muted-foreground">
                  No destinations found matching "{searchQuery}"
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setSearchQuery("")}
                >
                  Clear search
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
