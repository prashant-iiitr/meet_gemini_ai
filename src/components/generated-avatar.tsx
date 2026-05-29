 import {createAvatar} from "@dicebear/core";
 import {botttsNeutral, initials} from "@dicebear/collection";
 import { cn } from "@/lib/utils";
 import{Avatar,AvatarFallback,AvatarImage} from "@/components/ui/avatar";

 interface GeneratedAvatarProps {
    seed:string;
    className?:string;
    variant: "bottsNeutal" | "initials";
 }

 export const GeneratedAvatar =({
    seed,
    className,
    variant
 }: GeneratedAvatarProps)=>{
  let avatar;

if (variant === "bottsNeutal"){
    avatar=createAvatar(botttsNeutral,{
     seed,   
    })
}  else{
    avatar=createAvatar(initials,{
        seed,
    fontWeight:500,
    fontSize:43,
    });  
}
return(
    <Avatar className={cn(className)}>
        <AvatarImage src={avatar.toDataUri()} alt="Avatar" />
        <AvatarFallback>{seed.charAt(0).toUpperCase()}</AvatarFallback>
    </Avatar>
);

 };