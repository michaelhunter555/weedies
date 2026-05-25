import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";

const benefits = [
  "Keep 90% of revenue - no hidden fees",
  "Instant payouts via Stripe",
  "Built-in licensing and refunds",
  "Reviews & analytics out of the box",
  "Curated discovery - reach real buyers",
];

const BenefitsList = () => {
  return (
    <List>
      {benefits.map((val, i) => (
        <ListItem key={i}>
          <ListItemIcon>
            <CheckCircleIcon color="success" sx={{ fontSize: 15 }} />
          </ListItemIcon>
          <ListItemText secondary={val} />
        </ListItem>
      ))}
    </List>
  );
};

export default BenefitsList;
