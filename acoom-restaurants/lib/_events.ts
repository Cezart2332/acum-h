export default interface Event {
  id: string;
  title: string;
  date: string;
  location: string;
  image?: string | null;
}

export const events: Event[] = [
  {
    id: "1",
    title: "Workshop UX Design",
    date: "2025-06-01",
    location: "București, Impact Hub",
    image:
      "https://plus.unsplash.com/premium_photo-1661683679905-b01c7f51f746?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", // UX workshop
  },
  {
    id: "2",
    title: "Conferința Tech 2025",
    date: "2025-07-15",
    location: "Cluj-Napoca, BT Arena",
    image: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d", // conferință tech
  },
  {
    id: "3",
    title: "Târgul StartUp Connect",
    date: "2025-09-10",
    location: "Iași, Palas",
    image:
      "https://images.unsplash.com/photo-1690192224976-6e66e888807e?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", // târg startup
  },
  {
    id: "4",
    title: "Hackathon Național",
    date: "2025-10-05",
    location: "Timișoara, INCUB Center",
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475", // hackathon
  },
  {
    id: "5",
    title: "Webinar Inteligență Artificială",
    date: "2025-11-21",
    location: "Online",
    image:
      "https://plus.unsplash.com/premium_photo-1683121710572-7723bd2e235d?q=80&w=2532&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D5cd20", // AI webinar
  },
  {
    id: "6",
    title: "Meetup TechVision Community",
    date: "2025-12-12",
    location: "București, Mindspace",
    image: "https://images.unsplash.com/photo-1492724441997-5dc865305da7", // meetup
  },
];
