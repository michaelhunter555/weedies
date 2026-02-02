import React, { useState } from "react";

import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";

type ProductTabProps = {
  id: number;
  tabTitle: string;
  tabContent: string;
};

const productTabs: ProductTabProps[] = [
  {
    id: 0,
    tabTitle: "Product Description",
    tabContent: `
    <h2>Mihe X-900 Fitness Bike</h2>
    It's compareable to the Echelon EX-5 with the main difference being that with Echelon you can put two bottles of water on the bike. It's easy to assemble and it can help you acheive your weight-loss goals. At the end of the day, if your goal is to shave off a couple pounds and make a change for a better tomorrow, then the Mihe-X 900 can help you acheive that goal.
    <h3>Manage Your Intensity</h3>
    
Easily adjust the intensity to match your workout goals with the mihe-x 900. Ramp it up for a more vigorous session or dial it back for a relaxed ride while multitasking.
<br/>

<h3>Clip-In Pedals</h3>
Stay secure with sturdy metal pedals designed for a no-slip grip, keeping you locked in and focused throughout your ride.
<br/>
<h3>5 Minutes a Day</h3>

Just 5-10 minutes of daily cycling can sharpen your focus and boost productivity for the rest of the day.

<br />
<h3>Easy Local Pickup</h3>
Choose store pickup at checkout for a hassle-free way to save time and money.

<br />
<h3>Adjusts for Height & Weight</h3>
Built to accommodate riders of all shapes and sizes, this bike supports up to 300 lbs and suits individuals between 5 ft and 6 ft 8 in tall.


<br />
<h3>Magnetic Resistance</h3>
Customize your workout with smooth, adjustable resistance. Go from effortless pedaling to intense cycling and find the level that works best for you.

<br />
<h3>Adjustable for the Family</h3>
Perfect for everyone in the household. The bike adjusts easily, making it a versatile option for all body types and fitness levels.

<br />
<h3>Professional Handlebars</h3>

Feel like a pro with handlebars designed for a realistic cycling experience. Lock in, engage, and enjoy every ride.`,
  },
  { id: 1, tabTitle: "Dimensions", tabContent: "Max-Weight: 300lbs" },
  {
    id: 2,
    tabTitle: "Return Policy",
    tabContent:
      "There are no returns for in-store pick-ups. Please view the showroom display and ask as many questions as possible.",
  },
  {
    id: 3,
    tabTitle: "Shipping Policy",
    tabContent:
      "Please contact us to see if shipping options are available. This offer is only for in-store pickups, however, if you wish to arrange your own shipping and pickup, we will work with you to get your order fulfilled.",
  },
];

const allyProps = (index: number) => {
  return {
    id: `product-tab-${index}`,
    "aria-controls": `product-tab-${index}`,
  };
};

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const CustomTabPanel = (props: TabPanelProps) => {
  const { children, index, value, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const ProductTabs = () => {
  const [selectedTab, setSelectedTab] = useState<number>(0);

  const handleTabClick = (i: number) => setSelectedTab(i);

  return (
    <Box>
      <Tabs
        value={selectedTab}
        scrollButtons="auto"
        variant="scrollable"
        onChange={(event: React.SyntheticEvent, val: any) =>
          handleTabClick(Number(val))
        }
      >
        {productTabs.map((tab, i) => (
          <Tab key={i} label={tab.tabTitle} {...allyProps(i)} />
        ))}
      </Tabs>
      <Box
        sx={{
          width: "100%",
          border: "1px solid #b1b1b1",
          borderRadius: 5,
          height: 300,
          overflowY: "auto",
          marginTop: "1rem",
        }}
      >
        <CustomTabPanel value={selectedTab} index={selectedTab}>
          <Typography
            color="text.secondary"
            variant="subtitle1"
            dangerouslySetInnerHTML={{
              __html: productTabs[selectedTab]?.tabContent,
            }}
          />
        </CustomTabPanel>
      </Box>
    </Box>
  );
};

export default ProductTabs;
