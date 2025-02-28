import { detect } from "@tonaljs/chord-detect";
import { useContext, useEffect, useRef, useState } from "react";
import { Chord, Note } from "tonal";
import { WebMidi } from "webmidi";
import { KeyContext, MidiInputContext, ThemeContext } from "../pages/main";
import convertChordToCorrectKey from "../utils/chordConversion";
import {
  isControlChangeMessage,
  isStatusOff,
  isStatusOn,
} from "../utils/globalVars";
import { getItem } from "../utils/localStorage";
import { darkModeFontColor, lightModeFontColor } from "../utils/styles";
import Piano from "./Piano";

const FreeMIDIHandler = () => {
  const midiNumbers = useRef<number[]>([]);
  const chord = useRef("");
  const altChords = useRef([""]);
  const chordQuality = useRef("");
  const [pitchValues, setPitchValues] = useState<number[]>([]);
  const midiSetUpComplete = useRef(false);
  const { theme } = useContext(ThemeContext);

  const { midiInputs } = useContext(MidiInputContext);
  const { key } = useContext(KeyContext);
  const [isFootPedalPressed, setIsFootPedalPressed] = useState(false);

  useEffect(() => {
    if (WebMidi !== undefined) {
      midiInputs.forEach((input) => {
        input.removeListener("midimessage");
        input.addListener("noteon", handleMIDIMessage);
        input.addListener("noteoff", handleMIDIMessage);
        input.addListener("midimessage", handleSustainPedalMessage);
      });
    }

    setIsFootPedalPressed(false);
    setPitchValues([]);
    midiSetUpComplete.current = true;
    chord.current = "";
    altChords.current = [""];
    chordQuality.current = "";
  }, [midiInputs]);

  // Function to handle incoming MIDI data
  function handleMIDIMessage(event: any) {
    if (event.data.length === 3) {
      const [status, pitch, velocity] = event.data;
      if (isStatusOn(status) && velocity !== 0) {
        midiNumbers.current = Array.from(
          new Set(midiNumbers.current.concat(pitch))
        ).sort((a, b) => {
          return a - b;
        });

        const chords = detect(
          midiNumbers.current.map((value) => Note.fromMidi(value)),
          { assumePerfectFifth: true }
        );

        chord.current = convertChordToCorrectKey(
          chords[0],
          getItem("key-preference") as string
        );

        if (chord.current.length > 0) {
          try {
            if (
              !chord.current.includes("sus") &&
              !(Chord.get(chord.current).quality == "Unknown")
            ) {
              chordQuality.current = Chord.get(chord.current).quality;
            } else if (!(Chord.get(chord.current).quality == "Unknown")) {
              chordQuality.current = "Suspended";
            }
          } catch (e) {
            console.log("error", e);
          }
        }

        altChords.current = chords
          .slice(1, 4)
          .map((chord) =>
            convertChordToCorrectKey(chord, getItem("key-preference") as string)
          );

        setPitchValues(midiNumbers.current);
      } else if (
        isStatusOff(status) ||
        (isStatusOn(status) && velocity === 0)
      ) {
        midiNumbers.current = midiNumbers.current.filter(
          (value) => value !== pitch
        );

        const chords = detect(
          midiNumbers.current.map((value) => Note.fromMidi(value)),
          { assumePerfectFifth: true }
        );

        chord.current = convertChordToCorrectKey(
          chords[0],
          getItem("key-preference") as string
        );

        if (chord.current.length > 0) {
          try {
            if (
              !chord.current.includes("sus") &&
              !(Chord.get(chord.current).quality == "Unknown")
            ) {
              chordQuality.current = Chord.get(chord.current).quality;
            } else if (!(Chord.get(chord.current).quality == "Unknown")) {
              chordQuality.current = "Suspended";
            }
          } catch (e) {
            console.log("error", e);
          }
        } else {
          chordQuality.current = "";
        }

        altChords.current = chords
          .slice(1, 4)
          .map((chord) =>
            convertChordToCorrectKey(chord, getItem("key-preference") as string)
          );

        setPitchValues(midiNumbers.current);
      }
    }
  }

  function handleSustainPedalMessage(event: any) {
    if (isControlChangeMessage(event.data[0], event.data[1])) {
      const pedalValue = event.data[2]; // Pedal value ranging from 0 to 127

      if (pedalValue >= 64) {
        setIsFootPedalPressed(true);
      } else {
        setIsFootPedalPressed(false);
      }
    }
  }

  return (
    <div>
      {/* <div
        className="absolute top-[43%] left-[5%] font-normal text-2xl"
        style={{
          color:
            theme === "light-mode" ? lightModeFontColor : darkModeFontColor,
        }}
      >
        <div
          style={{
            color:
              theme === "light-mode" ? lightModeFontColor : darkModeFontColor,
          }}
        >
          Key: {key}
        </div>
      </div> */}
      <div className="absolute top-[77%] left-[2%] flex gap-[5px] items-center">
        <div
          className={`w-3 h-3 rounded-full no-transition border-2 ${
            isFootPedalPressed ? "bg-teal-600" : "white"
          }`}
          style={{
            borderColor:
              theme === "light-mode" ? lightModeFontColor : darkModeFontColor,
          }}
        ></div>
        <div
          className="text-sm"
          style={{
            color:
              theme === "light-mode" ? lightModeFontColor : darkModeFontColor,
          }}
        >
          Sustain
        </div>
      </div>
      <div className="absolute top-[40%] w-full flex flex-col items-center leading-8">
        {midiInputs.length === 0 ? (
          <>
            {/* <MIDIInputSymbol /> */}
            <div
              className="text-lg mt-2"
              style={{
                color:
                  theme === "light-mode"
                    ? lightModeFontColor
                    : darkModeFontColor,
              }}
            >
              No MIDI input detected. Connect a device to begin.
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-y-10">
            <div
              className="text-4xl text-center"
              style={{
                color:
                  theme === "light-mode"
                    ? lightModeFontColor
                    : darkModeFontColor,
              }}
            >
              {chordQuality.current}
            </div>
            <div className="relative">
              <div className="absolute rounded-md inset-y-[-25px] inset-x-[-25px] z-10 backdrop-blur-lg"></div>
              <div
                style={{
                  color:
                    theme === "light-mode"
                      ? lightModeFontColor
                      : darkModeFontColor,
                }}
              >
                <div
                  className="mb-2.5 text-4xl text-center"
                  style={{
                    color:
                      theme === "light-mode"
                        ? lightModeFontColor
                        : darkModeFontColor,
                  }}
                >
                  {chord.current}
                </div>
                {altChords.current.map((value, index) => (
                  <div
                    className="font-extralight mb-[5px] text-2xl text-center"
                    style={{
                      color:
                        theme === "light-mode"
                          ? lightModeFontColor
                          : darkModeFontColor,
                    }}
                    key={index}
                  >
                    {value}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0">
        <Piano
          midiNumbers={pitchValues}
          noteOnColor={getItem("color-preference")}
        />
      </div>
    </div>
  );
};

export default FreeMIDIHandler;
