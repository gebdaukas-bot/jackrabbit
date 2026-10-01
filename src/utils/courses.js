export const BUILT_IN_COURSES = [
  {
    name: "Pebble Beach",
    par: [4,5,4,4,3,5,3,4,4, 4,4,3,4,5,4,4,3,5],
    hcp: [8,12,14,16,18,2,6,4,10, 9,3,17,7,1,11,15,13,5],
  },
  {
    name: "Bethpage Black",
    par: [4,4,3,5,4,4,3,5,4, 4,3,4,4,4,5,3,5,4],
    hcp: [3,7,11,15,1,9,17,5,13, 6,14,10,2,8,4,18,16,12],
  },
  {
    name: "Wild Dunes — Links Course",
    par: [5,4,4,3,5,4,4,3,4, 4,4,3,4,5,4,3,4,3],
    hcp: [11,13,5,17,7,3,9,15,1, 12,10,16,2,14,8,18,6,4],
  },
  {
    name: "Wild Dunes — Harbor Course",
    par: [5,4,3,4,3,4,3,5,5, 4,3,4,3,5,4,3,4,4],
    hcp: [5,3,17,1,13,11,15,7,9, 10,18,6,14,12,8,16,2,4],
  },
  {
    name: "Misquamicut Club",
    par: [4,4,3,4,4,3,5,3,4, 4,4,3,4,4,4,4,5,3],
    hcp: [7,1,13,11,5,15,3,17,9, 12,16,18,4,2,10,8,6,14],
  },
  {
    name: "Fishers Island Club",
    par: [4,3,4,4,3,5,4,5,4, 4,3,4,4,4,5,3,4,5],
    hcp: [8,14,10,2,6,12,4,18,16, 3,13,11,5,1,9,17,7,15],
  },
  {
    name: "Streamsong Red",
    par: [4,5,4,4,4,3,5,3,4, 4,4,4,5,3,4,3,4,5],
    hcp: [4,2,14,16,6,18,12,10,8, 9,5,3,15,11,1,7,13,17],
  },
  {
    name: "Streamsong Blue",
    par: [4,5,4,4,3,4,3,4,5, 3,4,4,4,5,4,3,5,4],
    hcp: [14,10,8,4,16,18,12,2,6, 15,1,11,17,9,7,13,5,3],
  },
  {
    name: "Streamsong Black",
    par: [5,4,4,5,3,4,3,4,4, 5,4,5,4,4,3,4,3,5],
    hcp: [12,16,4,2,6,18,14,8,10, 11,3,7,9,15,17,1,13,5],
  },
  {
    name: "Streamsong Bone Valley",
    par: [4,4,3,5,4,4,3,4,5, 4,4,3,4,5,4,3,4,5],
    hcp: [5,7,13,9,1,17,15,3,11, 6,12,18,2,14,16,10,4,8],
    // GolfCourseAPI has no tee data for Bone Valley, so the tee we play is kept here.
    tees: [{ name: "Black/Silver", slope: 125, rating: 70.6 }],
  },
  {
    name: "The Chain (Streamsong)",
    par: [3,3,3,3,3,3,3,4,3, 3,3,3,3,3,3,3,3,3],
    hcp: [2,4,6,8,10,12,14,16,18, 1,3,5,7,9,11,13,15,17],
  },
  {
    name: "Nassau Country Club",
    par: [4,4,3,5,3,4,4,4,4, 3,4,4,4,4,5,3,4,4],
    hcp: [9,11,13,5,17,1,3,7,15, 16,2,6,8,12,4,18,10,14],
  },
  {
    name: "Francis A. Byrne GC",
    par: [4,3,4,4,3,4,4,4,4, 4,4,4,4,3,5,4,3,5],
    hcp: [5,11,7,13,17,1,15,9,3, 10,8,2,6,18,16,4,12,14],
  },
];

// The course and the tees being played, e.g. "Streamsong Black - Blue Tees".
// A women's/men's tag from the course search moves after the word "Tees"
// ("Gold (W)" → "Gold Tees (W)"). Just the course name if no tee was picked.
export function courseLabel(course) {
  const name = course?.name || "";
  const tee = course?.teeName || course?.selectedTee?.name;
  if (!name || !tee) return name;
  const [, base, tag] = tee.match(/^(.*?)\s*(\([MW]\))?$/);
  const tees = /\btees?\b/i.test(base) ? base : `${base} Tees`;
  return `${name} - ${tees}${tag ? ` ${tag}` : ""}`;
}
