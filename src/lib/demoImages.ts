/**
 * Shared sample images for in-browser demos. Lives at /public/demo-images/.
 * Add new files there and add an entry below - every demo that wants a
 * "try one of these" gallery imports from here.
 */
export type DemoImage = {
  url: string;
  alt: string;
  /** Optional starter labels for vision/classification demos. */
  suggestedLabels?: string[];
};

export const DEMO_IMAGES: DemoImage[] = [
  {
    url: "/demo-images/dog.jpg",
    alt: "Dog",
    suggestedLabels: [
      "a photo of a dog",
      "a photo of a cat",
      "a photo of a wolf",
      "a photo of a sleeping animal",
    ],
  },
  {
    url: "/demo-images/street.jpg",
    alt: "Street",
    suggestedLabels: [
      "a busy city street",
      "a quiet residential road",
      "a photo of a car",
      "a photo of a pedestrian",
    ],
  },
  {
    url: "/demo-images/kitchen.jpg",
    alt: "Kitchen",
    suggestedLabels: [
      "a photo of a kitchen",
      "a photo of a living room",
      "a photo of food",
      "a photo of an empty room",
    ],
  },
  {
    url: "/demo-images/nature.jpg",
    alt: "Nature",
    suggestedLabels: [
      "a photo of a forest",
      "a photo of a mountain",
      "a photo of a beach",
      "a photo of a lake",
    ],
  },
  {
    url: "/demo-images/beach.jpg",
    alt: "Beach",
    suggestedLabels: [
      "a photo of the ocean",
      "a photo of a mountain",
      "a photo of a sunset",
      "a photo of sand",
    ],
  },
  {
    url: "/demo-images/food.jpg",
    alt: "Food",
    suggestedLabels: [
      "a photo of food",
      "a photo of vegetables",
      "a photo of a meal",
      "a photo of a kitchen",
    ],
  },
  {
    url: "/demo-images/portrait.jpg",
    alt: "Portrait",
    suggestedLabels: [
      "a portrait of a person",
      "a black and white photo",
      "a photo of someone smiling",
      "a photo of a face",
    ],
  },
  {
    url: "/demo-images/city.jpg",
    alt: "City",
    suggestedLabels: [
      "a photo of a city skyline",
      "a photo of a building",
      "a photo of a bridge",
      "a photo of a sky",
    ],
  },
];
