import { create } from "zustand";

export interface City {
  cityId: number;
  name: string;
  bgmUrl: string;
}

export interface Trace {
  familyMember: string;
  content: string;
  imgUrl?: string;
}

export type VoyageState = "ANCHORED" | "SAILING" | "PAUSED";

export interface CityArrival {
  cityName: string;
  description: string;
  imageUrl: string;
}

interface VoyageStore {
  voyageState: VoyageState;
  currentCity: City | null;
  destinationCityId: number | null;
  progress: number;
  isFamilyReunited: boolean;
  discoveredTrace: Trace | null;
  directionAngle: number | null;
  remainingSeconds: number;
  occurredEventIds: number[];
  completing: boolean;
  cityArrival: CityArrival | null;

  setVoyageState: (state: VoyageState) => void;
  setCurrentCity: (city: City) => void;
  setDestinationCityId: (id: number | null) => void;
  setProgress: (progress: number) => void;
  setIsFamilyReunited: (v: boolean) => void;
  setDiscoveredTrace: (trace: Trace | null) => void;
  setDirectionAngle: (angle: number | null) => void;
  setRemainingSeconds: (seconds: number) => void;
  addOccurredEvent: (eventId: number) => void;
  clearOccurredEvents: () => void;
  setCompleting: (v: boolean) => void;
  setCityArrival: (v: CityArrival | null) => void;
}

export const useVoyageStore = create<VoyageStore>((set) => ({
  voyageState: "ANCHORED",
  currentCity: null,
  destinationCityId: null,
  progress: 0,
  isFamilyReunited: false,
  discoveredTrace: null,
  directionAngle: null,
  remainingSeconds: 0,
  occurredEventIds: [],
  completing: false,
  cityArrival: null,

  setVoyageState: (state) => set({ voyageState: state }),
  setCurrentCity: (city) => set({ currentCity: city }),
  setDestinationCityId: (id) => set({ destinationCityId: id }),
  setProgress: (progress) => set({ progress }),
  setIsFamilyReunited: (v) => set({ isFamilyReunited: v }),
  setDiscoveredTrace: (trace) => set({ discoveredTrace: trace }),
  setDirectionAngle: (angle) => set({ directionAngle: angle }),
  setRemainingSeconds: (seconds) => set({ remainingSeconds: seconds }),
  addOccurredEvent: (eventId) =>
      set((s) => ({
        occurredEventIds: s.occurredEventIds.includes(eventId)
            ? s.occurredEventIds
            : [...s.occurredEventIds, eventId],
      })),
  clearOccurredEvents: () => set({ occurredEventIds: [] }),
  setCompleting: (v) => set({ completing: v }),
  setCityArrival: (v) => set({ cityArrival: v }),
}));