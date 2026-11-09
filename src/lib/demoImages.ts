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
    alt: "Dog on a beach",
    suggestedLabels: [
      "a photo of a dog",
      "a photo of a cat",
      "a photo of a wolf",
      "a photo of a sleeping animal",
    ],
  },
  {
    url: "/demo-images/street.jpg",
    alt: "City street",
    suggestedLabels: [
      "a busy city street",
      "a quiet residential road",
      "a photo of a car",
      "a photo of a pedestrian",
    ],
  },
  {
    url: "/demo-images/kitchen.jpg",
    alt: "Two people cooking",
    suggestedLabels: [
      "two people cooking",
      "a photo of a kitchen",
      "a photo of a living room",
      "a red cooking pot",
    ],
  },
  {
    url: "/demo-images/nature.jpg",
    alt: "Green hills at sunset",
    suggestedLabels: [
      "a photo of grassy hills",
      "a photo of a mountain",
      "a sunset sky",
      "a photo of a beach",
    ],
  },
  {
    url: "/demo-images/food.jpg",
    alt: "Coffee on a wooden table",
    suggestedLabels: [
      "a cup of coffee",
      "a brass bell",
      "paper receipts",
      "a plate of pasta",
    ],
  },
  {
    url: "/demo-images/portrait.jpg",
    alt: "Woman with sunglasses and flowers",
    suggestedLabels: [
      "a woman wearing sunglasses",
      "a bunch of flowers",
      "a field of grass",
      "a black and white photo",
    ],
  },
  {
    url: "/demo-images/mug.jpg",
    alt: "Red mug",
    suggestedLabels: [
      "a red mug",
      "a postage stamp",
      "a city skyline",
      "a wooden table",
    ],
  },
  {
    url: "/demo-images/cat-nose.jpg",
    alt: "Close-up of a cat's nose",
    suggestedLabels: [
      "a close-up of a cat",
      "a close-up of a dog",
      "a photo of fur",
      "a pink nose",
    ],
  },
];
