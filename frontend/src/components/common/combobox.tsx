import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Framework {
  value: string;
  label: string;
}

interface ComboboxProps {
  fetchData: Array<{ name: string; _id: string }> | undefined;
  queryKey: string;
  placeholder: string;
}

const defaultFrameworks: Framework[] = [
  { value: "next.js", label: "Next.js" },
  { value: "sveltekit", label: "SvelteKit" },
  { value: "nuxt.js", label: "Nuxt.js" },
  { value: "remix", label: "Remix" },
  { value: "astro", label: "Astro" },
];

export const Combobox: React.FC<ComboboxProps> = ({
  fetchData,
  placeholder,
}) => {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("remix");
  const [frameworks, setFrameworks] =
    React.useState<Framework[]>(defaultFrameworks);
  const [searchQuery, setSearchQuery] = React.useState("");

  React.useEffect(() => {
    if (fetchData && Array.isArray(fetchData)) {
      const additionalFrameworks = fetchData.map((item) => ({
        label: item.name,
        value: item._id,
      }));
      setFrameworks((prev) => [...prev, ...additionalFrameworks]);
    }
  }, [fetchData]);

  const selectedFramework = frameworks.find(
    (framework) => framework.value === value
  );

  const filteredFrameworks = frameworks.filter((framework) =>
    framework.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="justify-between"
        >
          {selectedFramework ? selectedFramework.label : "Select framework..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput
            placeholder={placeholder}
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandEmpty>No {placeholder} found.</CommandEmpty>
          <CommandGroup>
            <CommandList>
              {filteredFrameworks.map((framework) => (
                <CommandItem
                  key={framework.value}
                  value={framework.value}
                  onSelect={(currentValue: string) => {
                    setValue(currentValue === value ? "" : currentValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === framework.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {framework.label}
                </CommandItem>
              ))}
            </CommandList>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
