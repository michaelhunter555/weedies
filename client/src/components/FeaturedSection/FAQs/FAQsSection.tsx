import { useState } from "react";

import StyledText from "@/components/Shared/Text/StyledText";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import CardMedia from "@mui/material/CardMedia";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid2";
import Typography from "@mui/material/Typography";

interface FAQProps {
  isMobile: boolean;
}

const hunterHomeSurplusLink =
  "https://www.google.com/maps/place/Hunters+Home+Center/@39.3420134,-76.5094385,16z/data=!3m1!4b1!4m6!3m5!1s0x89c806337e1cd4dd:0x1389faefa77373b9!8m2!3d39.3420093!4d-76.5068636!16s%2Fg%2F1q662qw50?entry=ttu&g_ep=EgoyMDI0MTIxMS4wIKXMDSoASAFQAw%3D%3D";
const FAQS = [
  {
    panel: "panel-1",
    summary: "Where are you located?",
    details: `Our pickup location is in Rosedale, Md. 
      You can call beforehand and after to confirm your order and pickup. 
      One of our team members will be available to release the product to you.
      <br />
      <br />
      Store hours are from 9am - 5pm, Monday - Friday
      <br />
      <br />
      <a href=${hunterHomeSurplusLink} target="_blank">Find us here</a>
      
      `,
  },
  {
    panel: "panel-2",
    summary: "What happens if I'm not satisfied?",
    details:
      "Please inspect the bike and ask as many questions as possible. We do not accept returns for this promotion.",
  },
  {
    panel: "panel-3",
    summary: "Can I get a bulk discount?",
    details:
      "Yes, please speak call or come in and speak with one of our staff members during business hours to inquire for special offers.",
  },
];

const FaqSection = ({ isMobile }: FAQProps) => {
  const [panel, setPanel] = useState<string | boolean>("panel-0");

  const handlePanelChange =
    (tab: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
      setPanel(isExpanded ? tab : false);
    };

  return (
    <Grid
      container
      spacing={2}
      direction={isMobile ? "column" : "row"}
      alignItems="center"
    >
      <Grid size={isMobile ? 12 : 5} order={isMobile ? 2 : undefined}>
        {FAQS.map((faq, i) => (
          <Accordion
            key={`${panel}-${i}`}
            expanded={panel === faq.panel}
            onChange={handlePanelChange(faq.panel)}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <StyledText variant="subtitle1">{faq.summary}</StyledText>
            </AccordionSummary>
            <AccordionDetails>
              {/* <StyledText variant="subtitle2">{faq.details}</StyledText> */}
              <Typography
                variant="subtitle2"
                color="text.secondary"
                dangerouslySetInnerHTML={{ __html: faq.details }}
              />
            </AccordionDetails>
          </Accordion>
        ))}
      </Grid>
      <Divider
        flexItem
        orientation="vertical"
        sx={{
          margin: "1rem auto",
        }}
      />
      <Grid size={isMobile ? 12 : 6}>
        <Box sx={{ borderRadius: 5, border: "1px solid #b1b1b1" }}>
          <CardMedia
            component="img"
            src="mihe_faqs.svg"
            alt="mihe-rider"
            sx={{
              width: "100%",
              height: "100%",
              margin: "0 auto",
              objectFit: "cover",
            }}
          />
        </Box>
      </Grid>
    </Grid>
  );
};

export default FaqSection;
