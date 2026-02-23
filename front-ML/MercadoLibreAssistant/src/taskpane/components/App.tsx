import * as React from "react";
import { AssistantPanel } from "./AssistantPanel";

export interface AppProps {
  title: string;
}

const App = (props: AppProps) => {
  return (
    // Al agregar title={props.title}, TypeScript detecta que la variable sí se está leyendo
    <div className="ms-welcome" title={props.title}>
      <AssistantPanel />
    </div>
  );
};

export default App;