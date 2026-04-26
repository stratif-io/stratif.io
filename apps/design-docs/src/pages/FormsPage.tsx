import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Checkbox,
  Switch,
} from "@stratif-io/design-system";

export function FormsPage() {
  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Forms</h1>
      <p
        style={{ color: "var(--muted-foreground, #64748b)", marginBottom: 32 }}
      >
        Form elements and controls.
      </p>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 24,
          maxWidth: 400,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Label htmlFor="demo-input">Text Input</Label>
          <Input id="demo-input" placeholder="Enter a value..." />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Label htmlFor="demo-textarea">Textarea</Label>
          <Textarea id="demo-textarea" placeholder="Enter a longer value..." />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Label>Select</Label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Choose an option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="a">Option A</SelectItem>
              <SelectItem value="b">Option B</SelectItem>
              <SelectItem value="c">Option C</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Checkbox id="demo-checkbox" />
          <Label htmlFor="demo-checkbox">Checkbox label</Label>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Switch id="demo-switch" />
          <Label htmlFor="demo-switch">Toggle switch</Label>
        </div>

        <Button>Submit</Button>
      </div>
    </div>
  );
}
